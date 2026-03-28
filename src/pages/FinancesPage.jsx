// ============================================
// FinancesPage.jsx - SEGURIDAD MEJORADA
// Gestión de finanzas con validaciones de seguridad
// ✅ FIX CONCURRENCIA: Mutex en todas las operaciones con finally correcto
// ✅ NUEVO: Filtro por LeaderType (cruce frontend con tabla líderes)
// ============================================

import React, { useState, useEffect, useCallback } from "react";
import apiService from "../apiService";
import ModalAddFinance from "../components/ModalAddFinance";
import ModalFinanceStatistics from "../components/ModalFinanceStatistics";
import ModalDailyReportOptions from "../components/ModalDailyReportOptions";
import {
  generateFinancePDF,
  generateDailyFinancePDF,
} from "../services/financepdfgenerator";
import { logSecurityEvent, logUserAction } from "../utils/securityLogger";
import { transformForDisplay, prepareForBackend } from "../services/nameHelper";
import "../css/FinancesPage.css";

// 🔐 Debug condicional
const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[FinancesPage] ${message}`, data || "");
  }
};

const logError = (message, error) => {
  console.error(`[FinancesPage] ${message}`, error);
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

// ========== FUNCIONES AUXILIARES ==========
const getDateWithoutTimezone = (dateString) => {
  try {
    if (!dateString || typeof dateString !== "string") return new Date();
    const [year, month, day] = dateString.split("-").map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date();
    return new Date(year, month - 1, day);
  } catch (error) {
    logError("Error en getDateWithoutTimezone:", error);
    return new Date();
  }
};

const getDateStringWithoutTimezone = (date) => {
  try {
    if (!(date instanceof Date)) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (error) {
    logError("Error en getDateStringWithoutTimezone:", error);
    return "";
  }
};

// ========== CONSTANTES FUERA DEL COMPONENTE ==========
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
  TITHE: "💵 Diezmo",
  OFFERING: "🎁 Ofrenda",
  TITHE_AND_OFFERING: "💵🎁 Diezmo + Ofrenda", // ✅ NUEVO
  SEED_OFFERING: "🌱 Ofrenda de Semilla",
  BUILDING_FUND: "🏗️ Fondo de Construcción",
  FIRST_FRUITS: "🍇 Primicias",
  CELL_GROUP_OFFERING: "🏘️ Ofrenda Grupo de Célula",
};

const METHOD_LABELS = {
  CASH: "💵 Efectivo",
  BANK_TRANSFER: "🏦 Transferencia Bancaria",
};

// ✅ NUEVO: Etiquetas para tipos de líder
const LEADER_TYPE_LABELS = {
  SERVANT: "🌱 Servidor",
  LEADER_144: "🌿 Líder 144",
  LEADER_12: "🌳 Líder 12",
};

const FinancesPage = () => {
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

  // ✅ NUEVO: Estado para filtro de tipo de líder y lista de líderes
  const [selectedLeaderType, setSelectedLeaderType] = useState("ALL");
  const [leaders, setLeaders] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [statisticsData, setStatisticsData] = useState(null);
  const [editingFinance, setEditingFinance] = useState(null);

  // ✅ FIX CONCURRENCIA: Mutex para prevenir operaciones concurrentes
  const operationInProgress = React.useRef(false);

  // ✅ NUEVO: Cargar líderes una sola vez al montar el componente
  // Se hace en un useEffect separado para no mezclar responsabilidades con loadFinances.
  // Los líderes son pocos comparado con las finanzas, así que no impacta rendimiento.
  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        log("Cargando líderes para filtro por tipo");
        const leaderData = await apiService.getLeaders();
        setLeaders(leaderData || []);
        log("Líderes cargados", { count: leaderData?.length });
      } catch (err) {
        // No es crítico: si falla, el filtro simplemente no filtrará
        log("No se pudieron cargar líderes para filtro (no crítico)", err);
      }
    };
    fetchLeaders();
  }, []);

  // ========== LOAD FINANCES - CARGA SECUENCIAL PARA +500 REGISTROS ==========
  // ✅ FIX CONCURRENCIA: Carga página por página de forma secuencial (NO paralela)
  const loadFinances = useCallback(async () => {
    if (operationInProgress.current) {
      log("Carga ya en progreso, ignorando");
      return;
    }
    operationInProgress.current = true;
    setLoading(true);
    setError("");

    try {
      log("Cargando todos los ingresos financieros (secuencial)");

      const PAGE_SIZE = 100;
      let allFinancesData = [];
      let currentPage = 0;
      let hasMore = true;

      while (hasMore) {
        log(`Cargando página ${currentPage}...`);

        const response = await apiService.getFinances(currentPage, PAGE_SIZE);
        const pageContent = response?.content || [];

        allFinancesData = [...allFinancesData, ...pageContent];

        hasMore = response?.hasNext === true;
        currentPage++;

        log(
          `Página ${currentPage - 1} cargada: ${pageContent.length} registros`,
          {
            acumulado: allFinancesData.length,
            totalElements: response?.totalElements,
            hasMore,
          },
        );

        if (currentPage > 100) {
          log("⚠️ Límite de páginas alcanzado (100), deteniendo carga");
          break;
        }
      }

      log("Total finanzas cargadas", {
        count: allFinancesData.length,
        pages: currentPage,
      });

      if (!allFinancesData || allFinancesData.length === 0) {
        log("No hay registros financieros");
        setAllFinances([]);
        return;
      }

      // ✅ Deduplicar por ID para garantizar consistencia
      const uniqueMap = new Map();
      allFinancesData.forEach((finance) => {
        uniqueMap.set(finance.id, finance);
      });
      const uniqueFinances = Array.from(uniqueMap.values());

      if (uniqueFinances.length !== allFinancesData.length) {
        log("⚠️ Se eliminaron duplicados", {
          original: allFinancesData.length,
          deduplicado: uniqueFinances.length,
          duplicados: allFinancesData.length - uniqueFinances.length,
        });
      }

      const processedFinances = uniqueFinances.map((finance) => ({
        id: finance.id,
        memberId: finance.memberId,
        memberName: escapeHtml(finance.memberName || "Sin nombre"),
        amount: validateAmount(finance.amount),
        concept: finance.incomeConcept || "OTRO",
        method: finance.incomeMethod || "EFECTIVO",
        registrationDate: finance.registrationDate,
        isVerified: finance.isVerified === true,
        description: escapeHtml(finance.description || ""),
        incomeConcept: finance.incomeConcept,
        incomeMethod: finance.incomeMethod,
        recordedBy: finance.recordedBy || "-",
      }));

      log("Finanzas procesadas", { count: processedFinances.length });

      const transformedFinances = processedFinances.map((finance) =>
        transformForDisplay(finance, ["memberName"]),
      );

      setAllFinances(transformedFinances);

      logUserAction("load_finances", {
        financeCount: transformedFinances.length,
        pagesLoaded: currentPage,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error cargando finanzas:", err);
      setError("Error al cargar registros financieros");

      logSecurityEvent("finance_load_error", {
        errorType: "api_error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      operationInProgress.current = false;
    }
  }, []);

  // ========== RELOAD AND CLEAR FILTERS ==========
  const handleReloadAndClearFilters = useCallback(async () => {
    try {
      log("Recargando datos y limpiando filtros");

      setSelectedConcept("ALL");
      setSelectedMethod("ALL");
      setSelectedVerification("ALL");
      setSelectedLeaderType("ALL"); // ✅ NUEVO: limpiar filtro de líder
      setSearchText("");
      setStartDate("");
      setEndDate("");

      await loadFinances();

      log("Filtros limpiados y datos recargados");
    } catch (error) {
      logError("Error recargando:", error);
      setError("Error al recargar datos");
    }
  }, [loadFinances]);

  // ========== APPLY FILTERS ==========
  const applyFilters = useCallback(() => {
    try {
      let filtered = [...allFinances];

      // Ordenar por fecha (más recientes primero)
      filtered.sort((a, b) => {
        try {
          const dateA = new Date(a.registrationDate || 0).getTime();
          const dateB = new Date(b.registrationDate || 0).getTime();
          return dateB - dateA;
        } catch (e) {
          return 0;
        }
      });

      // Filtrar por concepto
      if (selectedConcept !== "ALL") {
        if (selectedConcept === "TITHE_AND_OFFERING") {
          // ✅ NUEVO: filtro combinado Diezmo + Ofrenda
          filtered = filtered.filter(
            (finance) =>
              finance.concept === "TITHE" || finance.concept === "OFFERING",
          );
        } else if (INCOME_CONCEPTS.includes(selectedConcept)) {
          filtered = filtered.filter(
            (finance) => finance.concept === selectedConcept,
          );
        }
      }

      // Filtrar por método
      if (selectedMethod !== "ALL" && INCOME_METHODS.includes(selectedMethod)) {
        filtered = filtered.filter(
          (finance) => finance.method === selectedMethod,
        );
      }

      // Filtrar por verificación
      if (selectedVerification !== "ALL") {
        if (selectedVerification === "VERIFIED") {
          filtered = filtered.filter((finance) => finance.isVerified === true);
        } else if (selectedVerification === "UNVERIFIED") {
          filtered = filtered.filter((finance) => finance.isVerified === false);
        }
      }

      // ✅ NUEVO: Filtrar por tipo de líder
      // Estrategia: construir un Set de memberId según el tipo seleccionado,
      // luego filtrar las finanzas cuyo memberId esté (o no) en ese Set.
      // El cruce se hace en frontend porque los líderes son un subconjunto pequeño
      // y ya están cargados; evita un request adicional al backend.
      if (selectedLeaderType !== "ALL") {
        if (selectedLeaderType === "NO_LEADER") {
          // Opción especial: miembros que NO son líderes en ningún tipo
          const allLeaderMemberIds = new Set(leaders.map((l) => l.memberId));
          filtered = filtered.filter(
            (finance) => !allLeaderMemberIds.has(finance.memberId),
          );
        } else {
          // Filtrar por tipo específico de líder (SERVANT, LEADER_144, LEADER_12)
          const memberIdsWithLeaderType = new Set(
            leaders
              .filter((l) => l.leaderType === selectedLeaderType)
              .map((l) => l.memberId),
          );
          filtered = filtered.filter((finance) =>
            memberIdsWithLeaderType.has(finance.memberId),
          );
        }
      }

      // Filtrar por fechas
      if (startDate && !endDate) {
        const targetDate = startDate;
        filtered = filtered.filter((finance) => {
          try {
            const financeDate = new Date(finance.registrationDate);
            const financeDateString = getDateStringWithoutTimezone(financeDate);
            return financeDateString === targetDate;
          } catch (e) {
            return false;
          }
        });
      } else if (startDate && endDate) {
        filtered = filtered.filter((finance) => {
          try {
            const financeDate = new Date(finance.registrationDate);
            const financeDateString = getDateStringWithoutTimezone(financeDate);
            return (
              financeDateString >= startDate && financeDateString <= endDate
            );
          } catch (e) {
            return false;
          }
        });
      } else if (!startDate && endDate) {
        filtered = filtered.filter((finance) => {
          try {
            const financeDate = new Date(finance.registrationDate);
            const financeDateString = getDateStringWithoutTimezone(financeDate);
            return financeDateString <= endDate;
          } catch (e) {
            return false;
          }
        });
      }

      // Filtrar por búsqueda
      if (searchText.trim()) {
        const search = searchText.toLowerCase();
        filtered = filtered.filter((finance) =>
          finance.memberName.toLowerCase().includes(search),
        );
      }

      log("Filtros aplicados", { count: filtered.length });
      setFilteredFinances(filtered);
    } catch (error) {
      logError("Error aplicando filtros:", error);
      setFilteredFinances(allFinances);
    }
  }, [
    allFinances,
    selectedConcept,
    selectedMethod,
    selectedVerification,
    selectedLeaderType, // ✅ NUEVO
    leaders, // ✅ NUEVO
    searchText,
    startDate,
    endDate,
  ]);

  // ========== INIT LOAD ==========
  useEffect(() => {
    loadFinances();
  }, [loadFinances]);

  // ========== APPLY FILTERS ON CHANGE ==========
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ========== CALCULATE STATISTICS ==========
  const calculateStatistics = useCallback(() => {
    try {
      const stats = {
        totalRecords: allFinances.length,
        totalAmount: 0,
        verifiedAmount: 0,
        unverifiedAmount: 0,
        verifiedCount: 0,
        unverifiedCount: 0,
        byConcept: {},
        byMethod: {},
      };

      allFinances.forEach((finance) => {
        const amount = validateAmount(finance.amount);
        stats.totalAmount += amount;

        if (finance.isVerified) {
          stats.verifiedAmount += amount;
          stats.verifiedCount += 1;
        } else {
          stats.unverifiedAmount += amount;
          stats.unverifiedCount += 1;
        }

        const concept = finance.concept || "OTRO";
        if (!stats.byConcept[concept]) {
          stats.byConcept[concept] = { count: 0, total: 0 };
        }
        stats.byConcept[concept].count += 1;
        stats.byConcept[concept].total += amount;

        const method = finance.method || "EFECTIVO";
        if (!stats.byMethod[method]) {
          stats.byMethod[method] = { count: 0, total: 0 };
        }
        stats.byMethod[method].count += 1;
        stats.byMethod[method].total += amount;
      });

      return stats;
    } catch (error) {
      logError("Error calculando estadísticas:", error);
      return {
        totalRecords: 0,
        totalAmount: 0,
        verifiedAmount: 0,
        unverifiedAmount: 0,
        verifiedCount: 0,
        unverifiedCount: 0,
        byConcept: {},
        byMethod: {},
      };
    }
  }, [allFinances]);

  // ========== EXPORT PDF ==========
  const handleExportPDF = useCallback(async () => {
    try {
      log("Generando PDF");

      if (
        startDate ||
        endDate ||
        selectedMethod !== "ALL" ||
        selectedVerification !== "ALL" ||
        selectedConcept !== "ALL" ||
        selectedLeaderType !== "ALL" || // ✅ NUEVO
        searchText.trim()
      ) {
        setShowReportModal(true);

        logUserAction("open_report_modal", {
          startDate,
          endDate,
          recordCount: filteredFinances.length,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let title = "Reporte de Ingresos Financieros";
      if (selectedConcept !== "ALL") {
        title = `Ingresos: ${getConceptLabel(selectedConcept)}`;
      }

      const data = {
        title,
        totalAmount: calculateStatistics().totalAmount,
        date: new Date().toLocaleDateString("es-CO"),
        finances: filteredFinances,
        statistics: calculateStatistics(),
      };

      generateFinancePDF(data, "financial-report");

      log("PDF generado exitosamente");

      logUserAction("export_finance_pdf", {
        type: "traditional",
        recordCount: filteredFinances.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error generando PDF:", err);
      setError("Error al generar PDF");
    }
  }, [
    startDate,
    endDate,
    selectedConcept,
    selectedMethod,
    selectedVerification,
    selectedLeaderType, // ✅ NUEVO
    searchText,
    filteredFinances,
    calculateStatistics,
  ]);

  // ========== CONFIRM REPORT ==========
  const handleConfirmReport = useCallback(
    (reportType) => {
      try {
        log("Generando reporte", { type: reportType });

        const stats = {
          totalRecords: filteredFinances.length,
          totalAmount: filteredFinances.reduce(
            (sum, f) => sum + (f.amount || 0),
            0,
          ),
          verifiedCount: filteredFinances.filter((f) => f.isVerified).length,
          unverifiedCount: filteredFinances.filter((f) => !f.isVerified).length,
          byConcept: {},
          finances: filteredFinances,
        };

        filteredFinances.forEach((finance) => {
          const concept = finance.concept || "OTRO";
          if (!stats.byConcept[concept]) {
            stats.byConcept[concept] = {
              count: 0,
              total: 0,
              verified: 0,
              pending: 0,
            };
          }
          stats.byConcept[concept].count++;
          stats.byConcept[concept].total += finance.amount || 0;
          if (finance.isVerified) {
            stats.byConcept[concept].verified++;
          } else {
            stats.byConcept[concept].pending++;
          }
        });

        let reportDateRange = "";
        let reportDateForPDF = "";

        if (startDate && endDate) {
          try {
            const startDateObj = getDateWithoutTimezone(startDate);
            const endDateObj = getDateWithoutTimezone(endDate);
            const startFormatted = startDateObj.toLocaleDateString("es-CO");
            const endFormatted = endDateObj.toLocaleDateString("es-CO");
            reportDateRange = `${startFormatted} - ${endFormatted}`;
            reportDateForPDF = `${startDate} a ${endDate}`;
          } catch (e) {
            logError("Error formateando rango de fechas:", e);
          }
        } else if (startDate) {
          try {
            const startDateObj = getDateWithoutTimezone(startDate);
            reportDateRange = startDateObj.toLocaleDateString("es-CO");
            reportDateForPDF = startDate;
          } catch (e) {
            logError("Error formateando fecha:", e);
          }
        } else if (endDate) {
          try {
            const endDateObj = getDateWithoutTimezone(endDate);
            reportDateRange = endDateObj.toLocaleDateString("es-CO");
            reportDateForPDF = endDate;
          } catch (e) {
            logError("Error formateando fecha:", e);
          }
        } else {
          const today = new Date();
          reportDateRange = today.toLocaleDateString("es-CO");
          reportDateForPDF = getDateStringWithoutTimezone(today);
        }

        const data = {
          startDate,
          endDate,
          date: reportDateForPDF,
          dateRange: reportDateRange,
          finances: filteredFinances,
          reportType,
          statistics: stats,
          config: {
            includeCharts: false,
            title: reportDateRange
              ? `Reporte de Ingresos - ${reportDateRange}`
              : "Reporte de Ingresos Financieros",
            showVerificationSummary: true,
            showConceptBreakdown: true,
            showMemberList: reportType === "members",
          },
        };

        generateDailyFinancePDF(data, "reporte-ingresos");

        log("PDF generado correctamente", {
          reportType,
          recordCount: filteredFinances.length,
          stats: stats,
        });

        logUserAction("generate_report_pdf", {
          startDate,
          endDate,
          reportType,
          recordCount: filteredFinances.length,
          timestamp: new Date().toISOString(),
        });

        setShowReportModal(false);
        alert("✅ Reporte generado exitosamente");
      } catch (err) {
        logError("Error generando PDF:", err);
        setError("Error al generar reporte");
      }
    },
    [startDate, endDate, filteredFinances],
  );

  // ========== ADD FINANCE ==========
  const handleAddFinance = useCallback(
    async (financeData) => {
      if (operationInProgress.current) {
        log("Operación ya en progreso, ignorando");
        return;
      }
      operationInProgress.current = true;

      try {
        log("Creando nuevo ingreso");

        if (!financeData || typeof financeData !== "object") {
          setError("Datos de ingreso inválidos");
          return;
        }

        const backendData = prepareForBackend(financeData, ["memberName"]);

        const idempotencyKey = `finance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await apiService.createFinance(backendData, idempotencyKey);

        log("Ingreso creado exitosamente");

        logUserAction("create_finance", {
          amount: financeData.amount,
          concept: financeData.concept,
          timestamp: new Date().toISOString(),
        });

        alert("Ingreso registrado exitosamente");
        setShowAddModal(false);
        operationInProgress.current = false;
        await loadFinances();
      } catch (err) {
        if (err?.response?.status === 409) {
          log("Registro duplicado detectado por el servidor");
          alert("⚠️ Este registro ya fue procesado. Recargando datos...");
          setShowAddModal(false);
          operationInProgress.current = false;
          await loadFinances();
          return;
        }

        logError("Error creando ingreso:", err);
        setError("Error al registrar ingreso");

        logSecurityEvent("finance_create_error", {
          errorType: "api_error",
          timestamp: new Date().toISOString(),
        });
      } finally {
        operationInProgress.current = false;
      }
    },
    [loadFinances],
  );

  // ========== EDIT FINANCE ==========
  // ========== EDIT FINANCE ==========
  const handleEditFinance = useCallback(
    async (financeData) => {
      if (operationInProgress.current) return;
      operationInProgress.current = true;
      setError(""); // Limpiamos errores previos

      try {
        // ... validaciones existentes ...

        log("Actualizando ingreso", { financeId: editingFinance.id });
        const backendData = prepareForBackend(financeData, ["memberName"]);

        await apiService.updateFinance(editingFinance.id, backendData);

        // ... éxito ...
        alert("✅ Ingreso actualizado exitosamente");
        setShowAddModal(false);
        setEditingFinance(null);
        await loadFinances();
      } catch (err) {
        logError("Error actualizando ingreso:", err);

        // ✅ CAPTURAR EL MENSAJE DEL BACKEND (Estado inválido / Mes cerrado)
        const serverMessage =
          err.response?.data?.message || err.response?.data?.error;
        const finalMessage = serverMessage || "Error al actualizar ingreso";

        setError(finalMessage); // Esto lo muestra en el banner rojo de arriba

        // Opcional: Mostrar un alert específico si es un error de validación (400 o 500 con mensaje)
        if (
          err.response?.status === 500 ||
          err.response?.status === 400 ||
          err.response?.status === 403
        ) {
          alert(`⚠️ ${finalMessage}`);
        }
      } finally {
        operationInProgress.current = false;
      }
    },
    [editingFinance, loadFinances],
  );

  // ========== VERIFY FINANCE ==========
  const handleVerifyFinance = useCallback(
    async (financeId) => {
      if (operationInProgress.current) {
        log("Operación ya en progreso, ignorando");
        return;
      }

      try {
        if (!financeId || typeof financeId !== "number") {
          setError("ID de registro inválido");
          return;
        }

        if (!window.confirm("¿Deseas verificar este registro?")) {
          return;
        }

        operationInProgress.current = true;

        log("Verificando ingreso", { financeId });

        await apiService.verifyFinance(financeId);

        log("Ingreso verificado exitosamente");

        logUserAction("verify_finance", {
          financeId,
          timestamp: new Date().toISOString(),
        });

        alert("Registro verificado exitosamente");
        operationInProgress.current = false;
        await loadFinances();
      } catch (err) {
        logError("Error verificando ingreso:", err);
        setError("Error al verificar ingreso");
      } finally {
        operationInProgress.current = false;
      }
    },
    [loadFinances],
  );

  // ========== DELETE FINANCE ==========
  const handleDeleteFinance = useCallback(
    async (financeId) => {
      if (operationInProgress.current) {
        log("Operación ya en progreso, ignorando");
        return;
      }

      try {
        if (!financeId || typeof financeId !== "number") {
          setError("ID de registro inválido");
          return;
        }

        if (
          !window.confirm("¿Estás seguro de que deseas eliminar este registro?")
        ) {
          return;
        }

        operationInProgress.current = true;

        log("Eliminando ingreso", { financeId });

        await apiService.deleteFinance(financeId);

        log("Ingreso eliminado exitosamente");

        logUserAction("delete_finance", {
          financeId,
          timestamp: new Date().toISOString(),
        });

        alert("Registro eliminado exitosamente");
        operationInProgress.current = false;
        await loadFinances();
      } catch (err) {
        logError("Error eliminando ingreso:", err);
        setError("Error al eliminar registro");
      } finally {
        operationInProgress.current = false;
      }
    },
    [loadFinances],
  );

  // ========== SHOW STATISTICS ==========
  const handleShowStatistics = useCallback(() => {
    try {
      log("Mostrando estadísticas");
      const stats = calculateStatistics();
      setStatisticsData(stats);
      setShowStatisticsModal(true);

      logUserAction("view_finance_statistics", {
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Error mostrando estadísticas:", err);
      setError("Error al generar estadísticas");
    }
  }, [calculateStatistics]);

  // ========== HELPER FUNCTIONS ==========
  const getConceptLabel = (concept) => {
    if (!concept || typeof concept !== "string") return concept;
    return CONCEPT_LABELS[concept] || concept;
  };

  const getMethodLabel = (method) => {
    if (!method || typeof method !== "string") return method;
    return METHOD_LABELS[method] || method;
  };

  const getVerificationLabel = (isVerified) => {
    return isVerified ? "✅ Verificado" : "⏳ Pendiente";
  };

  // ✅ NUEVO: Helper para obtener el tipo de líder de un miembro dado su memberId
  // Se usa para mostrar la insignia de líder en la tabla de finanzas.
  const getLeaderTypeForMember = (memberId) => {
    const leader = leaders.find((l) => l.memberId === memberId);
    return leader ? leader.leaderType : null;
  };

  // ✅ NUEVO: Helper para obtener la etiqueta del tipo de líder
  const getLeaderTypeLabel = (leaderType) => {
    return LEADER_TYPE_LABELS[leaderType] || leaderType;
  };

  // ========== FORMAT DATE RANGE FOR MODAL ==========
  const getFormattedDateRange = () => {
    if (startDate && endDate) {
      try {
        const startDateObj = getDateWithoutTimezone(startDate);
        const endDateObj = getDateWithoutTimezone(endDate);
        const startFormatted = startDateObj.toLocaleDateString("es-CO");
        const endFormatted = endDateObj.toLocaleDateString("es-CO");
        return `${startFormatted} - ${endFormatted}`;
      } catch (e) {
        return `${startDate} - ${endDate}`;
      }
    } else if (startDate) {
      try {
        const startDateObj = getDateWithoutTimezone(startDate);
        return startDateObj.toLocaleDateString("es-CO");
      } catch (e) {
        return startDate;
      }
    } else if (endDate) {
      try {
        const endDateObj = getDateWithoutTimezone(endDate);
        return endDateObj.toLocaleDateString("es-CO");
      } catch (e) {
        return endDate;
      }
    }
    return null;
  };

  return (
    <div className="finances-page">
      <div className="finances-page-container">
        <div className="finances-page__header">
          <h1>💰 Gestión de Finanzas</h1>
          <p>Registra y gestiona ingresos financieros de la iglesia</p>
        </div>

        {/* Coloca esto justo antes de los controles o debajo del header */}
        {error && (
          <div
            className="finances-page__error-banner"
            style={{
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              border: "1px solid #fca5a5",
              display: "flex",
              justifyContent: "between",
              alignItems: "center",
            }}
          >
            <span>
              <strong>Error:</strong> {error}
            </span>
            <button
              onClick={() => setError("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="finances-page__controls">
          <div className="finances-page__controls-grid">
            <div className="finances-page__filter-item">
              <label>🔍 Buscar Miembro</label>
              <input
                type="text"
                placeholder="Nombre del miembro..."
                value={searchText}
                onChange={(e) =>
                  setSearchText(validateSearchText(e.target.value))
                }
                maxLength="100"
              />
            </div>

            <div className="finances-page__filter-item">
              <label>💵 Filtrar por Concepto</label>
              <select
                value={selectedConcept}
                onChange={(e) => setSelectedConcept(e.target.value)}
              >
                <option value="ALL">Todos los Conceptos</option>
                <option value="TITHE_AND_OFFERING">
                  💵🎁 Diezmo + Ofrenda
                </option>{" "}
                {/* ✅ NUEVO */}
                {INCOME_CONCEPTS.map((concept) => (
                  <option key={concept} value={concept}>
                    {getConceptLabel(concept)}
                  </option>
                ))}
              </select>
            </div>

            <div className="finances-page__filter-item">
              <label>💳 Filtrar por Método</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
              >
                <option value="ALL">Todos los Métodos</option>
                {INCOME_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {getMethodLabel(method)}
                  </option>
                ))}
              </select>
            </div>

            <div className="finances-page__filter-item">
              <label>✅ Filtrar por Estado</label>
              <select
                value={selectedVerification}
                onChange={(e) => setSelectedVerification(e.target.value)}
              >
                <option value="ALL">Todos los Estados</option>
                <option value="VERIFIED">✅ Verificados</option>
                <option value="UNVERIFIED">⏳ Pendientes de Verificar</option>
              </select>
            </div>

            {/* ✅ NUEVO: Filtro por tipo de líder */}
            <div className="finances-page__filter-item">
              <label>👤 Filtrar por Tipo de Líder</label>
              <select
                value={selectedLeaderType}
                onChange={(e) => setSelectedLeaderType(e.target.value)}
              >
                <option value="ALL">Todos los Miembros</option>
                <option value="NO_LEADER">🙍 Solo No Líderes</option>
                {Object.entries(LEADER_TYPE_LABELS).map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="finances-page__filter-item">
              <label>📅 Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="finances-page__filter-item">
              <label>📅 Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="finances-page__actions">
            <button
              className="finances-page__btn finances-page__btn--primary"
              onClick={() => {
                setEditingFinance(null);
                setShowAddModal(true);
              }}
              title="Registrar nuevo ingreso"
            >
              ➕ Registrar
            </button>

            <button
              className="finances-page__btn finances-page__btn--secondary"
              onClick={handleShowStatistics}
              title="Ver estadísticas y gráficos"
            >
              📊 Estadísticas
            </button>

            <button
              className="finances-page__btn finances-page__btn--export"
              onClick={handleExportPDF}
              disabled={
                filteredFinances.length === 0 ||
                (!startDate &&
                  !endDate &&
                  selectedMethod === "ALL" &&
                  selectedVerification === "ALL" &&
                  selectedConcept === "ALL" &&
                  selectedLeaderType === "ALL" && // ✅ NUEVO
                  !searchText.trim())
              }
              title={
                filteredFinances.length === 0
                  ? "No hay datos para exportar"
                  : !startDate &&
                      !endDate &&
                      selectedMethod === "ALL" &&
                      selectedVerification === "ALL" &&
                      selectedConcept === "ALL" &&
                      selectedLeaderType === "ALL" && // ✅ NUEVO
                      !searchText.trim()
                    ? "Debes aplicar filtros para generar un reporte específico"
                    : "Generar reporte en PDF"
              }
            >
              📄 PDF
            </button>

            <button
              className="finances-page__btn finances-page__btn--refresh"
              onClick={handleReloadAndClearFilters}
              disabled={loading}
              title="Recargar datos y limpiar filtros"
            >
              🔄 Recargar
            </button>
          </div>
        </div>

        <div className="finances-page__filter-info">
          <p>
            Mostrando <strong>{filteredFinances.length}</strong> de{" "}
            <strong>{allFinances.length}</strong> registros
            {selectedConcept !== "ALL" &&
              ` · Concepto: ${getConceptLabel(selectedConcept)}`}
            {selectedMethod !== "ALL" &&
              ` · Método: ${getMethodLabel(selectedMethod)}`}
            {selectedVerification !== "ALL" &&
              ` · Estado: ${
                selectedVerification === "VERIFIED"
                  ? "Verificados"
                  : "Pendientes"
              }`}
            {/* ✅ NUEVO: mostrar filtro activo de tipo de líder */}
            {selectedLeaderType !== "ALL" &&
              ` · Tipo Líder: ${
                selectedLeaderType === "NO_LEADER"
                  ? "No Líderes"
                  : getLeaderTypeLabel(selectedLeaderType)
              }`}
            {startDate &&
              !endDate &&
              ` · 📅 ${getDateWithoutTimezone(startDate).toLocaleDateString(
                "es-CO",
              )}`}
            {startDate &&
              endDate &&
              ` · 📅 ${getDateWithoutTimezone(startDate).toLocaleDateString(
                "es-CO",
              )} - ${getDateWithoutTimezone(endDate).toLocaleDateString(
                "es-CO",
              )}`}
          </p>
        </div>

        {error && <div className="finances-page__error">❌ {error}</div>}

        {loading ? (
          <div className="finances-page__loading">
            ⏳ Cargando registros financieros...
          </div>
        ) : filteredFinances.length === 0 ? (
          <div className="finances-page__empty">
            <p>💰 No hay registros que coincidan con los filtros</p>
            {allFinances.length === 0 && (
              <p className="finances-page__empty-hint">
                💡 Comienza registrando tu primer ingreso
              </p>
            )}
          </div>
        ) : (
          <div className="finances-page__table-container">
            <table className="finances-page__table">
              <thead>
                <tr>
                  <th className="finances-page__col-member">Miembro</th>
                  <th className="finances-page__col-amount">Monto</th>
                  <th className="finances-page__col-concept">Concepto</th>
                  <th className="finances-page__col-method">Método</th>
                  <th className="finances-page__col-status">Estado</th>
                  <th className="finances-page__col-date">Fecha</th>
                  <th className="finances-page__col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredFinances.map((finance) => {
                  // ✅ NUEVO: Obtener el tipo de líder del miembro para mostrar insignia
                  const leaderType = getLeaderTypeForMember(finance.memberId);

                  return (
                    <tr
                      key={finance.id}
                      className={finance.isVerified ? "verified" : "unverified"}
                    >
                      <td className="finances-page__col-member">
                        <div className="finances-page__member-info">
                          <span className="finances-page__avatar">👤</span>
                          <div className="finances-page__member-details">
                            <span className="finances-page__member-name">
                              {finance.memberName}
                            </span>
                            {/* ✅ NUEVO: Insignia de tipo de líder (solo si es líder) */}
                            {leaderType && (
                              <span
                                className={`finances-page__leader-badge finances-page__leader-badge--${leaderType.toLowerCase()}`}
                                title={`Tipo de líder: ${getLeaderTypeLabel(leaderType)}`}
                              >
                                {getLeaderTypeLabel(leaderType)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="finances-page__col-amount">
                        <span className="finances-page__amount">
                          $ {(finance.amount || 0).toLocaleString("es-CO")}
                        </span>
                      </td>

                      <td className="finances-page__col-concept">
                        <span className="finances-page__badge">
                          {getConceptLabel(finance.concept)}
                        </span>
                      </td>

                      <td className="finances-page__col-method">
                        <span className="finances-page__method-badge">
                          {getMethodLabel(finance.method)}
                        </span>
                      </td>

                      <td className="finances-page__col-status">
                        <span
                          className={`finances-page__status-badge ${
                            finance.isVerified ? "verified" : "unverified"
                          }`}
                        >
                          {getVerificationLabel(finance.isVerified)}
                        </span>
                      </td>

                      <td className="finances-page__col-date">
                        {finance.registrationDate
                          ? new Date(
                              finance.registrationDate,
                            ).toLocaleDateString("es-CO")
                          : "-"}
                      </td>

                      <td className="finances-page__col-actions">
                        <div className="finances-page__action-buttons">
                          {!finance.isVerified && (
                            <button
                              className="finances-page__btn-action verify"
                              onClick={() => handleVerifyFinance(finance.id)}
                              title="Verificar registro"
                            >
                              ✅
                            </button>
                          )}
                          <button
                            className="finances-page__btn-action edit"
                            onClick={() => {
                              setEditingFinance(finance);
                              setShowAddModal(true);
                            }}
                            title="Editar registro"
                          >
                            ✏️
                          </button>
                          <button
                            className="finances-page__btn-action delete"
                            onClick={() => handleDeleteFinance(finance.id)}
                            title="Eliminar registro"
                          >
                            🗑️
                          </button>
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

      <ModalAddFinance
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingFinance(null);
        }}
        onSave={editingFinance ? handleEditFinance : handleAddFinance}
        initialData={editingFinance}
        isEditing={!!editingFinance}
      />

      <ModalFinanceStatistics
        isOpen={showStatisticsModal}
        onClose={() => setShowStatisticsModal(false)}
        data={statisticsData}
        allFinances={allFinances}
        onExportPDF={() => {
          try {
            const stats = calculateStatistics();
            generateFinancePDF(
              { statistics: stats, title: "Estadísticas de Finanzas" },
              "finance-statistics-report",
            );
          } catch (error) {
            logError("Error exportando estadísticas:", error);
            setError("Error al exportar estadísticas");
          }
        }}
      />

      <ModalDailyReportOptions
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onConfirm={handleConfirmReport}
        selectedDate={startDate || endDate}
        financesData={filteredFinances}
        dateRange={getFormattedDateRange()}
      />

      <style>{`
        .finances-page {
          transition: all 0.3s ease;
        }

        /* ✅ NUEVO: Estilos para insignias de tipo de líder en la tabla */
        .finances-page__member-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .finances-page__leader-badge {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 600;
          padding: 1px 7px;
          border-radius: 10px;
          line-height: 1.6;
          white-space: nowrap;
        }

        .finances-page__leader-badge--servant {
          background-color: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
        }

        .finances-page__leader-badge--leader_144 {
          background-color: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }

        .finances-page__leader-badge--leader_12 {
          background-color: #fef9c3;
          color: #a16207;
          border: 1px solid #fde68a;
        }
      `}</style>
    </div>
  );
};

export default FinancesPage;
