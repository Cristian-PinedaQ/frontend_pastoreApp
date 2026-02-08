// ============================================
// ParticipantDetailModal.jsx - CON FUNCIONALIDAD PDF
// Submodal para ver detalles y agregar pagos de un participante
// ============================================

import React, { useState, useContext, useEffect, useCallback } from "react";
import apiService from "../apiService";
import AuthContext from "../context/AuthContext";
import { generateParticipantsPDF } from "../services/participantsPdfGenerator";
import { transformForDisplay, transformArrayForDisplay } from "../services/nameHelper"; // Importar nameHelper
import "../css/ParticipantDetailModal.css";

const ParticipantDetailModal = ({
  isOpen,
  onClose,
  participant,
  activity,
  contribution,
  onAddPaymentSuccess,
}) => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("details");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [incomeMethod, setIncomeMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // ✅ NUEVO: Estado para datos del miembro
  const [memberDetails, setMemberDetails] = useState(null);

  // ✅ NUEVO: Estado para los datos actualizados de la contribución
  const [contributionData, setContributionData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ NUEVO: Estado para el historial de pagos
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    // Obtener información del usuario de múltiples fuentes
    const getUserInfo = () => {
      // 1. Del contexto AuthContext
      if (user?.name || user?.username) {
        return {
          name: user.name || user.username,
          email: user.email,
          id: user.id,
        };
      }

      // 2. Del localStorage
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.name || parsedUser.username) {
            return {
              name: parsedUser.name || parsedUser.username,
              email: parsedUser.email,
              id: parsedUser.id,
            };
          }
        }
      } catch (e) {
        console.error("Error parsing stored user:", e);
      }

      // 3. Del token JWT
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        if (token) {
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
              })
              .join(""),
          );

          const payload = JSON.parse(jsonPayload);
          return {
            name: payload.name || payload.sub || payload.username,
            email: payload.email,
            id: payload.id || payload.sub,
          };
        }
      } catch (e) {
        console.error("Error decoding token:", e);
      }

      // 4. De variables individuales
      const username =
        localStorage.getItem("username") ||
        localStorage.getItem("userName") ||
        sessionStorage.getItem("username");

      if (username) {
        return {
          name: username,
          email: "",
          id: localStorage.getItem("userId") || 1,
        };
      }

      // 5. Valor por defecto (para desarrollo)
      return {
        name: "Administrador",
        email: "admin@iglesia.com",
        id: 1,
      };
    };

    setCurrentUserInfo(getUserInfo());
  }, [user]);

  // ✅ NUEVO: Efecto para obtener datos del miembro
  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (!participant?.memberId) return;

      try {
        // Usar el endpoint existente /member/find/{id}
        const memberData = await apiService.request(
          `/member/find/${participant.memberId}`,
        );
        
        // ✅ USANDO nameHelper: Transformar nombres del miembro
        const transformedMemberData = transformForDisplay(memberData, ['name']);
        
        console.log("Datos del miembro obtenidos:", transformedMemberData);
        console.log("Distrito obtenido:", transformedMemberData.district);
        setMemberDetails(transformedMemberData);
      } catch (error) {
        console.error("Error obteniendo detalles del miembro:", error);
      }
    };

    if (isOpen && participant?.memberId) {
      fetchMemberDetails();
    }
  }, [isOpen, participant?.memberId]);

  // ✅ CORREGIDO: Función para cargar el historial de pagos usando useCallback
  const fetchPaymentHistory = useCallback(async () => {
    const contributionId = contribution?.id || participant.contributionId;
    
    if (!contributionId) {
      console.error("No hay ID de contribución para cargar historial");
      return;
    }

    try {
      console.log("📋 Cargando historial de pagos para contribución ID:", contributionId);
      
      // Usar el endpoint correcto: /activity-payment/contribution/{contributionId}
      const payments = await apiService.request(
        `/activity-payment/contribution/${contributionId}`,
        { method: "GET" }
      );
      
      console.log("✅ Historial de pagos cargado:", payments);
      
      // Mapear los datos del backend al formato esperado por el frontend
      const formattedPayments = Array.isArray(payments) ? payments.map(payment => ({
        id: payment.id,
        amount: payment.price,
        date: payment.registrationDate,
        incomeMethod: payment.incomeMethod,
        recordedBy: payment.recordedBy,
        memberName: payment.memberName,
        memberId: payment.memberId
      })) : [];
      
      // ✅ USANDO nameHelper: Transformar nombres en el historial de pagos
      const transformedPayments = transformArrayForDisplay(formattedPayments, ['memberName']);
      
      setPaymentHistory(transformedPayments);
      
      // Si tenemos datos de contribución, actualizar con los totales calculados
      const totalPaid = transformedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const activityPrice = activity?.price || 0;
      const pendingBalance = Math.max(0, activityPrice - totalPaid);
      const isFullyPaid = pendingBalance <= 0;
      
      setContributionData(prev => ({
        ...prev,
        totalPaid,
        pendingBalance,
        isFullyPaid,
        paymentHistory: transformedPayments
      }));
      
    } catch (err) {
      console.error("❌ Error cargando historial de pagos:", err);
      setPaymentHistory([]);
    }
  }, [contribution?.id, participant.contributionId, activity?.price]);

  // ✅ NUEVO: Efecto para cargar datos iniciales
  useEffect(() => {
    if (isOpen && contribution) {
      // ✅ USANDO nameHelper: Transformar nombres en la contribución
      const transformedContribution = transformForDisplay(contribution, ['memberName']);
      setContributionData(transformedContribution);
      
      // Cargar historial de pagos cuando se abra el modal
      fetchPaymentHistory();
    }
  }, [isOpen, contribution, fetchPaymentHistory]);

  // ✅ NUEVO: Función para recargar los datos de la contribución
  const refreshContributionData = async () => {
    const contributionId = contribution?.id || participant.contributionId;

    if (!contributionId) {
      console.error("No se puede recargar: falta contributionId");
      return;
    }

    setRefreshing(true);
    try {
      console.log("🔄 Recargando datos de contribución ID:", contributionId);

      // Primero cargar el historial de pagos
      await fetchPaymentHistory();
      
      // Luego intentar cargar datos específicos de la contribución si existe el endpoint
      try {
        const updatedContribution = await apiService.request(
          `/activity-payment/contribution/${contributionId}`,
          { method: "GET" },
        );

        console.log("✅ Datos actualizados:", updatedContribution);
        
        // ✅ USANDO nameHelper: Transformar nombres en la contribución actualizada
        const transformedContribution = transformForDisplay(updatedContribution, ['memberName']);
        setContributionData(transformedContribution);

        return transformedContribution;
      } catch (err) {
        console.log("⚠️ No se pudo cargar datos específicos de contribución, usando datos existentes");
        return contributionData || contribution || participant;
      }
    } catch (err) {
      console.error("❌ Error al recargar contribución:", err);
      return contributionData || contribution || participant;
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ NUEVO: Función para generar PDF del participante
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      // Obtener datos actualizados antes de generar el PDF
      const updatedData = await refreshContributionData();
      
      // Preparar datos para el PDF
      const pdfData = {
        activity: {
          name: activity.activityName || "Actividad sin nombre",
          price: activity.price || 0,
          quantity: activity.quantity || 0,
          endDate: activity.endDate,
          isActive: activity.isActive,
        },
        participants: [{
          ...participant,
          totalPaid: updatedData?.totalPaid || totalPaid,
          pendingBalance: updatedData?.pendingBalance || pendingBalance,
          isFullyPaid: updatedData?.isFullyPaid || isFullyPaid,
          paymentHistory: paymentHistory,
          leaderName: leaderName,
          districtName: districtName,
          enrollmentStatus: participant.enrollmentStatus,
          registrationDate: participant.registrationDate,
          memberName: participant.memberName // Nombre ya transformado
        }], // Solo este participante
        statistics: {
          total: 1,
          fullyPaid: isFullyPaid ? 1 : 0,
          partiallyPaid: !isFullyPaid && totalPaid > 0 ? 1 : 0,
          pending: pendingBalance > 0 ? 1 : 0,
          totalPaid: totalPaid,
          percentagePaid: Math.round(compliancePercentage),
        },
        filters: {
          searchText: participant.memberName || "",
          leaderFilter: leaderName || "",
          districtFilter: districtName || "",
        },
      };

      // Generar nombre del archivo
      const filename = `detalle-participante-${participant.memberName?.toLowerCase().replace(/\s+/g, "-") || "participante"}-${new Date().toISOString().split("T")[0]}`;

      // Llamar al generador de PDF
      const success = await generateParticipantsPDF(pdfData, filename);

      if (success) {
        setSuccess("✅ PDF generado exitosamente");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (error) {
      console.error("Error generando PDF:", error);
      setError("❌ Error al generar el PDF");
      setTimeout(() => setError(""), 3000);
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (!isOpen || !participant || !activity) return null;

  // ✅ MODIFICADO: Obtener datos de líder y distrito CORRECTAMENTE
  const rawLeaderName = 
    memberDetails?.leader?.name ||
    participant.leader?.name ||
    participant.leaderName;

  // Transformar el nombre del líder si existe
  const leaderName = rawLeaderName 
    ? transformForDisplay({ name: rawLeaderName }, ['name']).name
    : "Sin líder asignado";

  // ✅ CORREGIDO: El campo se llama district (no districtName)
  const districtName =
    memberDetails?.district ||
    memberDetails?.district?.districtName ||
    memberDetails?.district?.name ||
    participant.district ||
    participant.district?.districtName ||
    participant.districtName ||
    "Sin distrito";

  // ✅ ACTUALIZADO: Usar contributionData si está disponible, sino usar contribution o participant
  // NOTA: Los nombres ya están transformados desde los efectos
  const currentData = contributionData || contribution || participant;

  const totalPaid = currentData?.totalPaid || participant.totalPaid || 0;
  const pendingBalance =
    currentData?.pendingBalance || participant.pendingBalance || 0;
  const isFullyPaid =
    currentData?.isFullyPaid || participant.isFullyPaid || false;
  const activityPrice = activity?.price || 0;
  const compliancePercentage =
    activityPrice > 0 ? (totalPaid / activityPrice) * 100 : 0;

  // Usar el historial de pagos del estado local
  const currentPaymentHistory = paymentHistory.length > 0 
    ? paymentHistory 
    : currentData?.paymentHistory || participant.paymentHistory || [];

  // Función para obtener el nombre del usuario que registrará el pago
  const getRecordedBy = () => {
    if (currentUserInfo?.name) return currentUserInfo.name;

    const storedName =
      localStorage.getItem("username") ||
      localStorage.getItem("userName") ||
      sessionStorage.getItem("username");

    return storedName || "Usuario Sistema";
  };

  const handleAddPayment = async () => {
    // Validaciones
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setError("El monto debe ser mayor a cero");
      return;
    }

    const amount = parseFloat(paymentAmount);

    if (amount > pendingBalance) {
      setError(
        `El monto excede el saldo pendiente ($${pendingBalance.toLocaleString("es-CO")})`,
      );
      return;
    }

    const recordedByName = getRecordedBy();
    if (!recordedByName || recordedByName === "Usuario Sistema") {
      setError(
        "No se pudo obtener información del usuario logueado. Por favor, inicie sesión.",
      );
      return;
    }

    const contributionId = contribution?.id || participant.contributionId;

    if (!contributionId) {
      setError("Error: No se encontró el ID de contribución.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("=== REGISTRANDO PAGO ===");

      const paymentData = {
        amount: amount,
        incomeMethod: incomeMethod,
        recordedBy: recordedByName,
      };

      console.log("📤 Enviando pago:", paymentData);

      const result = await apiService.request(
        `/activity-payment/add-payment/${contributionId}`,
        {
          method: "POST",
          body: JSON.stringify(paymentData),
        },
      );

      console.log("✅ Pago registrado exitosamente:", result);

      // ✅ ACTUALIZADO: Recargar datos inmediatamente después del pago
      await refreshContributionData();

      // Notificar al componente padre con los datos actualizados
      if (onAddPaymentSuccess) {
        onAddPaymentSuccess({
          contributionId,
          amount,
          incomeMethod,
          recordedBy: recordedByName,
          apiResponse: result,
          updatedContribution: result, // ✅ Enviar datos actualizados
        });
      }

      setSuccess(result.message || "✅ Pago registrado exitosamente");
      setPaymentAmount("");

      // Si se completa el pago, sugerir cerrar el modal
      const newPendingBalance = result.pendingBalance || pendingBalance - amount;
      if (newPendingBalance <= 0) {
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        // Mantener abierto para más pagos
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("❌ Error en handleAddPayment:", err);

      let errorMessage = "Error al registrar el pago";

      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      if (errorMessage.includes("404")) {
        setError(`❌ Error 404 - Endpoint no encontrado`);
      } else if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError")
      ) {
        setError("🌐 Error de conexión con el backend");
      } else {
        setError(`❌ ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha mejorado
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  const hasContributionData =
    currentData || (participant && participant.memberId);

  return (
    <div className="participant-detail-modal-overlay">
      <div className="participant-detail-modal">
        {/* Header COMPACTO */}
        <div className="participant-detail-modal__header">
          <div className="participant-detail-modal__header-main">
            <div className="header-title-section">
              <button
                className="participant-detail-modal__close"
                onClick={onClose}
                aria-label="Cerrar"
              >
                ←
              </button>
              <div className="header-title-content">
                <h3>
                  <span className="header-icon">👤</span>
                  {participant.memberName || "Participante"}
                  {refreshing && <span className="refreshing-indicator"> 🔄</span>}
                </h3>
                <div className="header-subtitle">
                  <span className="subtitle-item">
                    <span className="subtitle-icon">👥</span>
                    {leaderName}
                  </span>
                  <span className="subtitle-divider">•</span>
                  <span className="subtitle-item">
                    <span className="subtitle-icon">📍</span>
                    {districtName}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="header-status-section">
              <div className="compact-status-info">
                <div
                  className={`compact-status-badge ${isFullyPaid ? "completed" : "pending"}`}
                >
                  {isFullyPaid ? "✅ Pagado" : "💰 Pendiente"}
                </div>
                <div className="compact-balance">
                  <span className="balance-label">Saldo:</span>
                  <span className={`balance-amount ${isFullyPaid ? "paid" : "pending"}`}>
                    ${pendingBalance.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ Botón de generar PDF en el header */}
          <div className="header-actions-compact">
            <button
              className="btn-generate-pdf-compact"
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
              title="Generar PDF del participante"
            >
              {generatingPDF ? (
                <span className="spinner"></span>
              ) : (
                <span className="btn-icon">📄</span>
              )}
              <span className="btn-text">PDF</span>
            </button>
          </div>
        </div>

        {/* Pestañas - MÁS COMPACTAS */}
        <div className="participant-detail-modal__tabs-compact">
          <button
            className={`tab-btn-compact ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            <span className="tab-icon">📊</span>
            <span className="tab-text">Detalles</span>
          </button>
          <button
            className={`tab-btn-compact ${activeTab === "addPayment" ? "active" : ""}`}
            onClick={() => setActiveTab("addPayment")}
            disabled={isFullyPaid}
          >
            <span className="tab-icon">💰</span>
            <span className="tab-text">
              Agregar Pago
              {isFullyPaid && (
                <span className="tab-badge">✓</span>
              )}
            </span>
          </button>
        </div>

        {/* Contenido */}
        <div className="participant-detail-modal__content">
          {/* ✅ NUEVO: Mensajes de generación de PDF */}
          {success && activeTab === "details" && (
            <div className="pdf-success-message">
              <span className="success-icon">✅</span>
              {success}
            </div>
          )}

          {error && activeTab === "details" && (
            <div className="pdf-error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Pestaña de Detalles */}
          {activeTab === "details" ? (
            <div className="details-tab">
              {/* ✅ NUEVO: Botón de generar reporte completo */}
              <div className="pdf-actions-section">
                <div className="pdf-actions-header">
                </div>
                <div className="pdf-actions-hint">
                  Los PDF incluyen toda la información del participante,
                  historial de pagos y estadísticas.
                </div>
              </div>

              {!hasContributionData ? (
                <div className="no-data-message">
                  <div className="no-data-icon">📭</div>
                  <h4>No hay datos de contribución disponibles</h4>
                  <p>
                    La información de contribución para este participante no
                    está disponible.
                  </p>
                </div>
              ) : (
                <>
                  {/* Información del Miembro */}
                  <div className="detail-section">
                    <h4>
                      <span className="section-icon">👤</span>
                      Información del Miembro
                    </h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Nombre:</span>
                        <span className="detail-value">
                          {/* ✅ Nombre ya transformado */}
                          {participant.memberName || "No disponible"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Líder:</span>
                        <span className="detail-value">{leaderName}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Distrito:</span>
                        <span className="detail-value">{districtName}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Fecha Inscripción:</span>
                        <span className="detail-value">
                          {formatDate(participant.registrationDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Información de la Actividad */}
                  <div className="detail-section">
                    <h4>
                      <span className="section-icon">🎯</span>
                      Información de la Actividad
                    </h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Actividad:</span>
                        <span className="detail-value">
                          {activity.activityName}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Precio Total:</span>
                        <span className="detail-value">
                          ${activityPrice.toLocaleString("es-CO")}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          Estado de Inscripción:
                        </span>
                        <span
                          className={`detail-value ${participant.enrollmentStatus?.toLowerCase() === "completed" ? "completed" : "pending"}`}
                        >
                          {participant.enrollmentStatus === "COMPLETED"
                            ? "Completado"
                            : participant.enrollmentStatus === "ACTIVE"
                              ? "Activo"
                              : "Pendiente"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resumen de Pagos */}
                  <div className="detail-section">
                    <h4>
                      <span className="section-icon">💰</span>
                      Resumen de Pagos
                    </h4>
                    <div className="payment-summary-cards">
                      <div className="payment-summary-card total">
                        <div className="payment-summary-icon">📊</div>
                        <div className="payment-summary-content">
                          <div className="payment-summary-label">
                            Total a Pagar
                          </div>
                          <div className="payment-summary-value">
                            ${activityPrice.toLocaleString("es-CO")}
                          </div>
                        </div>
                      </div>

                      <div className="payment-summary-card paid">
                        <div className="payment-summary-icon">✅</div>
                        <div className="payment-summary-content">
                          <div className="payment-summary-label">
                            Total Pagado
                          </div>
                          <div className="payment-summary-value">
                            ${totalPaid.toLocaleString("es-CO")}
                          </div>
                        </div>
                      </div>

                      <div className="payment-summary-card pending">
                        <div className="payment-summary-icon">📝</div>
                        <div className="payment-summary-content">
                          <div className="payment-summary-label">
                            Saldo Pendiente
                          </div>
                          <div className="payment-summary-value">
                            ${pendingBalance.toLocaleString("es-CO")}
                          </div>
                        </div>
                      </div>

                      <div className="payment-summary-card percentage">
                        <div className="payment-summary-icon">📈</div>
                        <div className="payment-summary-content">
                          <div className="payment-summary-label">
                            Porcentaje Pagado
                          </div>
                          <div className="payment-summary-value">
                            {compliancePercentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="compliance-section">
                      <div className="compliance-header">
                        <span className="compliance-label">
                          Progreso de Pago:
                        </span>
                        <span className="compliance-percentage">
                          {compliancePercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="compliance-bar">
                        <div
                          className="compliance-fill"
                          style={{
                            width: `${Math.min(100, compliancePercentage)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Historial de Pagos */}
                  {currentPaymentHistory.length > 0 ? (
                    <div className="detail-section">
                      <h4>
                        <span className="section-icon">📝</span>
                        Historial de Pagos ({currentPaymentHistory.length} pagos)
                      </h4>
                      <div className="payment-history">
                        <div className="payment-history-header">
                          <div className="payment-history-column">Fecha</div>
                          <div className="payment-history-column">Monto</div>
                          <div className="payment-history-column">Método</div>
                          <div className="payment-history-column">
                            Registrado por
                          </div>
                        </div>
                        {currentPaymentHistory.map((payment, index) => (
                          <div key={payment.id || index} className="payment-history-item">
                            <div className="payment-history-cell">
                              {formatDate(
                                payment.date || payment.registrationDate,
                              )}
                            </div>
                            <div className="payment-history-cell amount">
                              ${(payment.amount || payment.price || 0).toLocaleString("es-CO")}
                            </div>
                            <div className="payment-history-cell method">
                              <span
                                className={`method-badge ${payment.incomeMethod?.toLowerCase() || "cash"}`}
                              >
                                {payment.incomeMethod === "BANK_TRANSFER" ? "Transferencia" : "Efectivo"}
                              </span>
                            </div>
                            <div className="payment-history-cell recorded">
                              {payment.recordedBy || "Sistema"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="detail-section">
                      <h4>
                        <span className="section-icon">📝</span>
                        Historial de Pagos
                      </h4>
                      <div className="no-payments-message">
                        <div className="no-payments-icon">💸</div>
                        <p>
                          No se han registrado pagos para esta contribución.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Pestaña de Agregar Pago */
            <div className="add-payment-tab">
              {error && (
                <div className="payment-error">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}

              {success && (
                <div className="payment-success">
                  <span className="success-icon">✅</span>
                  {success}
                </div>
              )}

              {/* Resumen del estado actual */}
              <div className="payment-state-summary">
                <h4>
                  <span className="section-icon">💳</span>
                  Resumen del Estado Actual
                </h4>
                <div className="state-summary-grid">
                  <div className="state-summary-item">
                    <div className="state-summary-label">Precio Total:</div>
                    <div className="state-summary-value">
                      ${activityPrice.toLocaleString("es-CO")}
                    </div>
                  </div>
                  <div className="state-summary-item">
                    <div className="state-summary-label">Ya Pagado:</div>
                    <div className="state-summary-value paid">
                      ${totalPaid.toLocaleString("es-CO")}
                    </div>
                  </div>
                  <div className="state-summary-item">
                    <div className="state-summary-label">Saldo Pendiente:</div>
                    <div className="state-summary-value pending">
                      ${pendingBalance.toLocaleString("es-CO")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulario de pago */}
              <div className="payment-form-section">
                <h4>
                  <span className="section-icon">✏️</span>
                  Registrar Nuevo Pago
                </h4>

                <div className="payment-form">
                  {/* Monto */}
                  <div className="form-group">
                    <label htmlFor="paymentAmount">
                      <span className="form-label-icon">💰</span>
                      Monto a Pagar *
                    </label>
                    <div className="amount-input-group">
                      <span className="amount-prefix">$</span>
                      <input
                        id="paymentAmount"
                        type="number"
                        placeholder="0"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        disabled={loading || isFullyPaid}
                        min="0"
                        max={pendingBalance}
                        className="amount-input"
                      />
                      <div className="amount-actions">
                        <button
                          type="button"
                          className="btn-max"
                          onClick={() =>
                            setPaymentAmount(pendingBalance.toFixed(2))
                          }
                          disabled={isFullyPaid || pendingBalance <= 0}
                        >
                          PAGAR TODO (${pendingBalance.toLocaleString("es-CO")})
                        </button>
                      </div>
                    </div>
                    <div className="form-hint">
                      Monto máximo permitido:{" "}
                      <strong>${pendingBalance.toLocaleString("es-CO")}</strong>
                    </div>
                  </div>

                  {/* Método de pago */}
                  <div className="form-group">
                    <label htmlFor="incomeMethod">
                      <span className="form-label-icon">💳</span>
                      Método de Pago *
                    </label>
                    <div className="method-select-group">
                      <select
                        id="incomeMethod"
                        value={incomeMethod}
                        onChange={(e) => setIncomeMethod(e.target.value)}
                        disabled={loading || isFullyPaid}
                        className="method-select"
                      >
                        <option value="CASH">💵 Efectivo</option>
                        <option value="BANK_TRANSFER">🏦 Transferencia</option>
                      </select>
                    </div>
                  </div>

                  {/* Registrado por */}
                  <div className="form-group">
                    <label>
                      <span className="form-label-icon">👤</span>
                      Registrado por
                    </label>
                    <div className="recorded-by-info">
                      <input
                        type="text"
                        value={getRecordedBy()}
                        disabled
                        className="recorded-input"
                        placeholder="Usuario logueado"
                      />
                      <div className="form-hint">
                        Este campo se completa automáticamente con el usuario
                        logueado
                      </div>
                    </div>
                  </div>

                  {/* Botón de envío */}
                  <div className="form-actions">
                    <button
                      className="submit-payment-btn"
                      onClick={handleAddPayment}
                      disabled={
                        !paymentAmount ||
                        loading ||
                        isFullyPaid ||
                        pendingBalance <= 0
                      }
                    >
                      {loading ? (
                        <>
                          <span className="spinner"></span>
                          Procesando Pago...
                        </>
                      ) : (
                        <>
                          <span className="btn-icon">💳</span>
                          Registrar Pago
                        </>
                      )}
                    </button>

                    {isFullyPaid && (
                      <div className="fully-paid-message">
                        <span className="message-icon">✅</span>
                        Esta contribución ya ha sido pagada completamente
                      </div>
                    )}

                    {pendingBalance <= 0 && !isFullyPaid && (
                      <div className="fully-paid-message">
                        <span className="message-icon">💰</span>
                        No hay saldo pendiente para pagar
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Acciones - REMOVIDO EL BOTÓN DE PDF REDUNDANTE */}
        <div className="participant-detail-modal__actions">
          <button className="btn btn-secondary" onClick={onClose}>
            <span className="btn-icon">←</span>
            Volver a la Lista
          </button>
          {activeTab === "addPayment" && !isFullyPaid && pendingBalance > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleAddPayment}
              disabled={!paymentAmount || loading}
            >
              {loading ? "Procesando..." : "Confirmar Pago"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantDetailModal;