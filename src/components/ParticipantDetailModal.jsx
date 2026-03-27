// ============================================
// ParticipantDetailModal.jsx - CON PESTAÑA DE EDICIÓN DE ABONOS
// Submodal para ver detalles y agregar pagos de un participante
// ============================================

import React, { useState, useContext, useEffect, useCallback } from "react";
import apiService from "../apiService";
import AuthContext from "../context/AuthContext";
import { generateParticipantsPDF } from "../services/participantsPdfGenerator";
import {
  transformForDisplay,
  transformArrayForDisplay,
} from "../services/nameHelper";
import "../css/ParticipantDetailModal.css";
import ItemDeliveryToggle from "./ItemDeliveryToggle";

// ─── Helper: ¿la actividad sigue abierta para editar? ─────────────────────────
const isActivityEditable = (endDate) => {
  if (!endDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parsear la fecha como local, no UTC
  const [year, month, day] = endDate
    .toString()
    .split("T")[0]
    .split("-")
    .map(Number);
  const end = new Date(year, month - 1, day); // mes es 0-indexed
  end.setHours(0, 0, 0, 0);

  return end >= today;
};

const ParticipantDetailModal = ({
  isOpen,
  onClose,
  participant,
  activity,
  contribution,
  onAddPaymentSuccess,
  readOnly = false,
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

  // ✅ Estado para datos del miembro
  const [memberDetails, setMemberDetails] = useState(null);

  // ✅ Estado para los datos actualizados de la contribución
  const [contributionData, setContributionData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // Estado local del toggle de entrega
  const [itemDelivered, setItemDelivered] = useState(
    contribution?.itemDelivered ?? participant?.itemDelivered ?? false,
  );

  // ✅ Estado para el historial de pagos
  const [paymentHistory, setPaymentHistory] = useState([]);

  // ─── Estado del formulario de edición de abono ────────────────────────────
  const [editForm, setEditForm] = useState({
    selectedPaymentId: "",
    editAmount: "",
    editIncomeMethod: "CASH",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // ─── getRecordedBy con useCallback (antes de los useEffects que la usan) ──
  const getRecordedBy = useCallback(() => {
    if (currentUserInfo?.name) return currentUserInfo.name;

    const storedName =
      localStorage.getItem("username") ||
      localStorage.getItem("userName") ||
      sessionStorage.getItem("username");

    return storedName || "Usuario Sistema";
  }, [currentUserInfo]);

  useEffect(() => {
    const getUserInfo = () => {
      if (user?.name || user?.username) {
        return {
          name: user.name || user.username,
          email: user.email,
          id: user.id,
        };
      }
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
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        if (token) {
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
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
      return { name: "Administrador", email: "admin@iglesia.com", id: 1 };
    };
    setCurrentUserInfo(getUserInfo());
  }, [user]);

  // ✅ Efecto para obtener datos del miembro
  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (!participant?.memberId) return;
      try {
        const memberData = await apiService.request(
          `/member/find/${participant.memberId}`,
        );
        const transformedMemberData = transformForDisplay(memberData, ["name"]);
        setMemberDetails(transformedMemberData);
      } catch (error) {
        console.error("Error obteniendo detalles del miembro:", error);
      }
    };
    if (isOpen && participant?.memberId) {
      fetchMemberDetails();
    }
  }, [isOpen, participant?.memberId]);

  // ✅ Función para cargar el historial de pagos
  const fetchPaymentHistory = useCallback(async () => {
    const contributionId = contribution?.id || participant.contributionId;
    if (!contributionId) {
      console.error("No hay ID de contribución para cargar historial");
      return;
    }
    try {
      const payments = await apiService.request(
        `/activity-payment/contribution/${contributionId}`,
        { method: "GET" },
      );
      const formattedPayments = Array.isArray(payments)
        ? payments.map((payment) => ({
            id: payment.id,
            amount: payment.price,
            date: payment.registrationDate,
            incomeMethod: payment.incomeMethod,
            recordedBy: payment.recordedBy,
            memberName: payment.memberName,
            memberId: payment.memberId,
          }))
        : [];
      const transformedPayments = transformArrayForDisplay(formattedPayments, [
        "memberName",
      ]);
      setPaymentHistory(transformedPayments);

      const totalPaid = transformedPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      );
      const activityPrice = activity?.price || 0;
      const pendingBalance = Math.max(0, activityPrice - totalPaid);
      const isFullyPaid = pendingBalance <= 0;
      setContributionData((prev) => ({
        ...prev,
        totalPaid,
        pendingBalance,
        isFullyPaid,
        paymentHistory: transformedPayments,
      }));
    } catch (err) {
      console.error("❌ Error cargando historial de pagos:", err);
      setPaymentHistory([]);
    }
  }, [contribution?.id, participant.contributionId, activity?.price]);

  const participantItemDelivered = participant?.itemDelivered;

  useEffect(() => {
    setItemDelivered(
      contribution?.itemDelivered ?? participantItemDelivered ?? false,
    );
  }, [isOpen, contribution, participantItemDelivered, fetchPaymentHistory]);

  // ─── Inicializar formulario de edición cuando se abre la pestaña ──────────
  useEffect(() => {
    if (activeTab === "editContribution") {
      setEditForm({
        selectedPaymentId: "",
        editAmount: "",
        editIncomeMethod: "CASH",
      });
      setEditError("");
      setEditSuccess("");
      // ✅ Forzar recarga del historial al entrar a la pestaña
      fetchPaymentHistory();
    }
  }, [activeTab, fetchPaymentHistory]);

  // ✅ Función para recargar los datos de la contribución
  const refreshContributionData = async () => {
    const contributionId = contribution?.id || participant.contributionId;
    if (!contributionId) return;
    setRefreshing(true);
    try {
      await fetchPaymentHistory();
      try {
        const updatedContribution = await apiService.request(
          `/activity-payment/contribution/${contributionId}`,
          { method: "GET" },
        );
        const transformedContribution = transformForDisplay(
          updatedContribution,
          ["memberName"],
        );
        setContributionData(transformedContribution);
        return transformedContribution;
      } catch (err) {
        return contributionData || contribution || participant;
      }
    } catch (err) {
      console.error("❌ Error al recargar contribución:", err);
      return contributionData || contribution || participant;
    } finally {
      setRefreshing(false);
    }
  };

  // ─── Guardar edición del abono ─────────────────────────────────────────────
  const handleEditPayment = async () => {
    if (!editForm.selectedPaymentId) {
      setEditError("Debes seleccionar un abono para editar.");
      return;
    }
    if (!editForm.editAmount || parseFloat(editForm.editAmount) <= 0) {
      setEditError("El monto debe ser mayor a cero.");
      return;
    }

    setEditLoading(true);
    setEditError("");
    setEditSuccess("");

    try {
      const result = await apiService.request(
        `/activity-payment/update/${editForm.selectedPaymentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            amount: parseFloat(editForm.editAmount),
            incomeMethod: editForm.editIncomeMethod,
          }),
        },
      );

      await refreshContributionData();

      if (onAddPaymentSuccess) {
        onAddPaymentSuccess({ type: "editPayment", apiResponse: result });
      }

      setEditSuccess("✅ Abono actualizado correctamente.");
      setEditForm({
        selectedPaymentId: "",
        editAmount: "",
        editIncomeMethod: "CASH",
      });
      setTimeout(() => setEditSuccess(""), 3500);
    } catch (err) {
      if (err.status === 403) {
        setEditError("⛔ La actividad ya cerró. No se pueden editar abonos.");
      } else {
        const msg =
          err.data?.error || err.message || "Error al actualizar el abono.";
        setEditError(`❌ ${msg}`);
      }
    } finally {
      setEditLoading(false);
    }
  };

  // ✅ Función para generar PDF del participante
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const updatedData = await refreshContributionData();
      const pdfData = {
        activity: {
          name: activity.activityName || "Actividad sin nombre",
          price: activity.price || 0,
          quantity: activity.quantity || 0,
          endDate: activity.endDate,
          isActive: activity.isActive,
        },
        participants: [
          {
            ...participant,
            totalPaid: updatedData?.totalPaid || totalPaid,
            pendingBalance: updatedData?.pendingBalance || pendingBalance,
            isFullyPaid: updatedData?.isFullyPaid || isFullyPaid,
            paymentHistory: paymentHistory,
            leaderName: leaderName,
            districtName: districtName,
            enrollmentStatus: participant.enrollmentStatus,
            registrationDate: participant.registrationDate,
            memberName: participant.memberName,
          },
        ],
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
      const filename = `detalle-participante-${participant.memberName?.toLowerCase().replace(/\s+/g, "-") || "participante"}-${new Date().toISOString().split("T")[0]}`;
      const successResult = await generateParticipantsPDF(pdfData, filename);
      if (successResult) {
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

  const handleDeliveryChange = useCallback(
  (contributionId, newValue) => {
    setItemDelivered(newValue);
    // Propagar al padre para actualizar la lista de participantes
    if (onAddPaymentSuccess) {
      onAddPaymentSuccess({
        type: "deliveryChange",
        contributionId,
        itemDelivered: newValue,
        // ✅ Asegurar que se actualiza con el valor correcto
        delivered: newValue,
        isDelivered: newValue,
        item_delivered: newValue
      });
    }
  },
  [onAddPaymentSuccess],
);

  if (!isOpen || !participant || !activity) return null;

  // ✅ Obtener datos de líder y distrito
  const rawLeaderName =
    memberDetails?.leader?.name ||
    participant.leader?.name ||
    participant.leaderName;

  const leaderName = rawLeaderName
    ? transformForDisplay({ name: rawLeaderName }, ["name"]).name
    : "Sin líder asignado";

  const districtName =
    memberDetails?.district ||
    memberDetails?.district?.districtName ||
    memberDetails?.district?.name ||
    participant.district ||
    participant.district?.districtName ||
    participant.districtName ||
    "Sin distrito";

  const currentData = contributionData || contribution || participant;
  const totalPaid = currentData?.totalPaid || participant.totalPaid || 0;
  const pendingBalance =
    currentData?.pendingBalance || participant.pendingBalance || 0;
  const isFullyPaid =
    currentData?.isFullyPaid || participant.isFullyPaid || false;
  const activityPrice = activity?.price || 0;
  const compliancePercentage =
    activityPrice > 0 ? (totalPaid / activityPrice) * 100 : 0;

  const currentPaymentHistory =
    paymentHistory.length > 0
      ? paymentHistory
      : currentData?.paymentHistory || participant.paymentHistory || [];

  // ─── ¿Actividad editable? ─────────────────────────────────────────────────
  const canEdit = isActivityEditable(activity?.endDate);
  // ✅ Así debe quedar — parsear local
  const endDateFormatted = activity?.endDate
    ? (() => {
        const [year, month, day] = activity.endDate
          .toString()
          .split("T")[0]
          .split("-")
          .map(Number);
        return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      })()
    : null;

  const hasContributionData =
    currentData || (participant && participant.memberId);

  // ─── El abono seleccionado actualmente ────────────────────────────────────
  const selectedPayment = editForm.selectedPaymentId
    ? currentPaymentHistory.find(
        (p) => String(p.id) === String(editForm.selectedPaymentId),
      )
    : null;

  const handleAddPayment = async () => {
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
      const paymentData = { amount, incomeMethod, recordedBy: recordedByName };
      const result = await apiService.request(
        `/activity-payment/add-payment/${contributionId}`,
        { method: "POST", body: JSON.stringify(paymentData) },
      );
      await refreshContributionData();
      if (onAddPaymentSuccess) {
        onAddPaymentSuccess({
          contributionId,
          amount,
          incomeMethod,
          recordedBy: recordedByName,
          apiResponse: result,
          updatedContribution: result,
        });
      }
      setSuccess(result.message || "✅ Pago registrado exitosamente");
      setPaymentAmount("");
      const newPendingBalance =
        result.pendingBalance || pendingBalance - amount;
      if (newPendingBalance <= 0) {
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      let errorMessage = "Error al registrar el pago";
      let detailedError = "";
      let errorData = err.data || err.response?.data || {};
      if (err.data) errorData = err.data;
      const errorString = JSON.stringify(errorData).toLowerCase();

      if (
        errorString.includes("email") &&
        (errorString.includes("obligatorio") ||
          errorString.includes("required") ||
          errorString.includes("validation failed"))
      ) {
        const memberName = participant.memberName || "El miembro";
        setError(
          <div className="error-details">
            <div className="error-main">⚠️ No se puede procesar el pago</div>
            <div className="error-secondary">
              <strong>{memberName}</strong> no tiene un email registrado en el
              sistema.
              <br />
              <span
                style={{
                  fontSize: "0.9rem",
                  color: "#666",
                  marginTop: "0.5rem",
                  display: "block",
                }}
              >
                Para poder completar el pago, primero debe actualizar los datos
                del miembro con un correo electrónico válido.
              </span>
            </div>
            <div className="error-actions">
              <button
                className="error-action-btn"
                onClick={() => {
                  setActiveTab("details");
                  alert("Funcionalidad de edición de miembro - Próximamente");
                }}
              >
                ✏️ Ver Datos del Miembro
              </button>
              <button
                className="error-action-btn secondary"
                onClick={() => setError("")}
              >
                ✖️ Cerrar
              </button>
            </div>
          </div>,
        );
        setLoading(false);
        return;
      }
      if (
        errorString.includes("rollback") ||
        errorString.includes("transaction")
      ) {
        errorMessage = "❌ Error en la transacción";
        detailedError =
          "El pago no pudo ser procesado. Por favor, intente nuevamente.";
      }
      if (err.status === 404 || errorString.includes("404")) {
        setError("❌ El endpoint no existe");
      } else if (err.message?.includes("Failed to fetch") || err.status === 0) {
        setError("🌐 Error de conexión con el servidor");
      } else {
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
        if (detailedError) {
          setError(
            <div className="error-details">
              <div className="error-main">❌ {errorMessage}</div>
              <div className="error-secondary">{detailedError}</div>
            </div>,
          );
        } else {
          setError(`❌ ${errorMessage}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="participant-detail-modal-overlay">
      <div className="participant-detail-modal">
        {/* ── Header ─────────────────────────────────────────────────────── */}
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
                  {refreshing && (
                    <span className="refreshing-indicator"> 🔄</span>
                  )}
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
                  <span
                    className={`balance-amount ${isFullyPaid ? "paid" : "pending"}`}
                  >
                    ${pendingBalance.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            </div>
          </div>
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

        {/* ── Pestañas ────────────────────────────────────────────────────── */}
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
              {isFullyPaid && <span className="tab-badge">✓</span>}
            </span>
          </button>
          <button
            className={`tab-btn-compact ${activeTab === "editContribution" ? "active" : ""} ${!canEdit ? "tab-btn-disabled" : ""}`}
            onClick={() => canEdit && setActiveTab("editContribution")}
            title={
              !canEdit
                ? `La actividad cerró el ${endDateFormatted}`
                : "Editar abono"
            }
          >
            <span className="tab-icon">{canEdit ? "✏️" : "🔒"}</span>
            <span className="tab-text">Editar Abono</span>
            {!canEdit && (
              <span className="tab-badge tab-badge--locked">🔒</span>
            )}
          </button>
        </div>

        {/* ── Contenido ───────────────────────────────────────────────────── */}
        <div className="participant-detail-modal__content">
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

          {/* ════ PESTAÑA: DETALLES ════════════════════════════════════════ */}
          {activeTab === "details" && (
            <div className="details-tab">
              <div className="pdf-actions-section">
                <div className="pdf-actions-header"></div>
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
                  <div className="detail-section">
                    <h4>
                      <span className="section-icon">👤</span>Información del
                      Miembro
                    </h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Nombre:</span>
                        <span className="detail-value">
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

                  {/* ── Entrega del artículo ──────────────────────────────────── */}
                  <div className="detail-section">
                    <h4>
                      <span className="section-icon">📦</span>Entrega del
                      Artículo
                    </h4>
                    <ItemDeliveryToggle
                      contributionId={
                        contribution?.id || participant?.contributionId
                      }
                      initialDelivered={itemDelivered}
                      memberName={participant?.memberName}
                      onDeliveryChange={handleDeliveryChange}
                      disabled={readOnly}
                    />
                  </div>

                  <div className="detail-section">
                    <h4>
                      <span className="section-icon">🎯</span>Información de la
                      Actividad
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
                          className={`detail-value ${(currentData?.enrollmentStatus || participant.enrollmentStatus)?.toLowerCase() === "completed" ? "completed" : "pending"}`}
                        >
                          {(currentData?.enrollmentStatus ||
                            participant.enrollmentStatus) === "COMPLETED"
                            ? "Completado"
                            : (currentData?.enrollmentStatus ||
                                  participant.enrollmentStatus) === "ACTIVE"
                              ? "Activo"
                              : "Pendiente"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Registrado por:</span>
                        <span className="detail-value">
                          {currentData?.recordedBy ||
                            participant.recordedBy ||
                            "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>
                      <span className="section-icon">💰</span>Resumen de Pagos
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

                  {currentPaymentHistory.length > 0 ? (
                    <div className="detail-section">
                      <h4>
                        <span className="section-icon">📝</span>Historial de
                        Pagos ({currentPaymentHistory.length} pagos)
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
                          <div
                            key={payment.id || index}
                            className="payment-history-item"
                          >
                            <div className="payment-history-cell">
                              {formatDate(
                                payment.date || payment.registrationDate,
                              )}
                            </div>
                            <div className="payment-history-cell amount">
                              $
                              {(
                                payment.amount ||
                                payment.price ||
                                0
                              ).toLocaleString("es-CO")}
                            </div>
                            <div className="payment-history-cell method">
                              <span
                                className={`method-badge ${payment.incomeMethod?.toLowerCase() || "cash"}`}
                              >
                                {payment.incomeMethod === "BANK_TRANSFER"
                                  ? "Transferencia"
                                  : "Efectivo"}
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
                        <span className="section-icon">📝</span>Historial de
                        Pagos
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
          )}

          {/* ════ PESTAÑA: AGREGAR PAGO ════════════════════════════════════ */}
          {activeTab === "addPayment" && (
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

              <div className="payment-state-summary">
                <h4>
                  <span className="section-icon">💳</span>Resumen del Estado
                  Actual
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

              <div className="payment-form-section">
                <h4>
                  <span className="section-icon">✏️</span>Registrar Nuevo Pago
                </h4>
                <div className="payment-form">
                  <div className="form-group">
                    <label htmlFor="paymentAmount">
                      <span className="form-label-icon">💰</span>Monto a Pagar *
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

                  <div className="form-group">
                    <label htmlFor="incomeMethod">
                      <span className="form-label-icon">💳</span>Método de Pago
                      *
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

                  <div className="form-group">
                    <label>
                      <span className="form-label-icon">👤</span>Registrado por
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
                          <span className="spinner"></span>Procesando Pago...
                        </>
                      ) : (
                        <>
                          <span className="btn-icon">💳</span>Registrar Pago
                        </>
                      )}
                    </button>
                    {isFullyPaid && (
                      <div className="fully-paid-message">
                        <span className="message-icon">✅</span>Esta
                        contribución ya ha sido pagada completamente
                      </div>
                    )}
                    {pendingBalance <= 0 && !isFullyPaid && (
                      <div className="fully-paid-message">
                        <span className="message-icon">💰</span>No hay saldo
                        pendiente para pagar
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════ PESTAÑA: EDITAR ABONO ════════════════════════════════════ */}
          {activeTab === "editContribution" && (
            <div className="edit-contribution-tab">
              {/* Banner de actividad cerrada */}
              {!canEdit && (
                <div className="edit-closed-banner">
                  <span className="edit-closed-icon">🔒</span>
                  <div className="edit-closed-text">
                    <strong>Actividad cerrada</strong>
                    <span>
                      La fecha de cierre fue el {endDateFormatted}. Los abonos
                      ya no pueden modificarse.
                    </span>
                  </div>
                </div>
              )}

              {canEdit && (
                <>
                  {/* Info de contexto */}
                  <div className="edit-info-banner">
                    <span className="edit-info-icon">ℹ️</span>
                    <div className="edit-info-text">
                      Editando abono de{" "}
                      <strong>{participant.memberName}</strong>.
                      {endDateFormatted && (
                        <span className="edit-deadline">
                          {" "}
                          Fecha de cierre: <strong>{endDateFormatted}</strong>.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mensajes de feedback */}
                  {editError && (
                    <div className="edit-error-message">
                      <span>⚠️</span>
                      <span>{editError}</span>
                    </div>
                  )}
                  {editSuccess && (
                    <div className="edit-success-message">
                      <span>{editSuccess}</span>
                    </div>
                  )}

                  {/* Sin abonos registrados */}
                  {currentPaymentHistory.length === 0 ? (
                    <div className="no-payments-message">
                      <div className="no-payments-icon">💸</div>
                      <p>No hay abonos registrados para editar.</p>
                    </div>
                  ) : (
                    <div className="edit-form-section">
                      <h4>
                        <span className="section-icon">✏️</span>Editar Abono
                      </h4>
                      <div className="edit-form">
                        {/* ── Selector de abono ── */}
                        <div className="form-group">
                          <label htmlFor="selectPayment">
                            <span className="form-label-icon">📝</span>
                            Seleccionar Abono *
                          </label>
                          <select
                            id="selectPayment"
                            className="method-select"
                            value={editForm.selectedPaymentId}
                            onChange={(e) => {
                              const pid = e.target.value;
                              const pago = currentPaymentHistory.find(
                                (p) => String(p.id) === pid,
                              );
                              setEditForm({
                                selectedPaymentId: pid,
                                editAmount: pago ? String(pago.amount) : "",
                                editIncomeMethod: pago
                                  ? pago.incomeMethod
                                  : "CASH",
                              });
                              setEditError("");
                              setEditSuccess("");
                            }}
                            disabled={editLoading}
                          >
                            <option value="">-- Selecciona un abono --</option>
                            {currentPaymentHistory.map((p, i) => (
                              <option key={p.id} value={p.id}>
                                Abono #{i + 1} — $
                                {(p.amount || 0).toLocaleString("es-CO")} —{" "}
                                {formatDate(p.date)}
                              </option>
                            ))}
                          </select>
                          <div className="form-hint">
                            Selecciona el abono que deseas modificar.
                          </div>
                        </div>

                        {/* ── Campos de edición (solo cuando hay un abono seleccionado) ── */}
                        {editForm.selectedPaymentId && (
                          <>
                            {/* Info del abono seleccionado */}
                            {selectedPayment && (
                              <div
                                className="edit-readonly-section"
                                style={{ marginBottom: "16px" }}
                              >
                                <h5 className="edit-readonly-title">
                                  📌 Abono seleccionado
                                </h5>
                                <div className="detail-grid">
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Monto actual:
                                    </span>
                                    <span className="detail-value">
                                      $
                                      {(
                                        selectedPayment.amount || 0
                                      ).toLocaleString("es-CO")}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Método actual:
                                    </span>
                                    <span className="detail-value">
                                      {selectedPayment.incomeMethod ===
                                      "BANK_TRANSFER"
                                        ? "🏦 Transferencia"
                                        : "💵 Efectivo"}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">Fecha:</span>
                                    <span className="detail-value">
                                      {formatDate(selectedPayment.date)}
                                    </span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">
                                      Registrado por:
                                    </span>
                                    <span className="detail-value">
                                      {selectedPayment.recordedBy || "Sistema"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Nuevo monto */}
                            <div className="form-group">
                              <label htmlFor="editAmount">
                                <span className="form-label-icon">💰</span>Nuevo
                                Monto *
                              </label>
                              <div className="amount-input-group">
                                <span className="amount-prefix">$</span>
                                <input
                                  id="editAmount"
                                  type="number"
                                  className="amount-input"
                                  value={editForm.editAmount}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      editAmount: e.target.value,
                                    }))
                                  }
                                  disabled={editLoading}
                                  min="1"
                                  placeholder="0"
                                />
                              </div>
                              <div className="form-hint">
                                Ingresa el nuevo valor para este abono.
                              </div>
                            </div>

                            {/* Método de pago */}
                            <div className="form-group">
                              <label htmlFor="editIncomeMethod">
                                <span className="form-label-icon">💳</span>
                                Método de Pago *
                              </label>
                              <div className="method-select-group">
                                <select
                                  id="editIncomeMethod"
                                  className="method-select"
                                  value={editForm.editIncomeMethod}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      editIncomeMethod: e.target.value,
                                    }))
                                  }
                                  disabled={editLoading}
                                >
                                  <option value="CASH">💵 Efectivo</option>
                                  <option value="BANK_TRANSFER">
                                    🏦 Transferencia
                                  </option>
                                </select>
                              </div>
                            </div>

                            {/* Registrado por (automático, solo lectura) */}
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
                                  Este campo se completa automáticamente con el
                                  usuario logueado.
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Botones */}
                        <div className="form-actions">
                          <button
                            className="submit-payment-btn"
                            onClick={handleEditPayment}
                            disabled={
                              editLoading || !editForm.selectedPaymentId
                            }
                          >
                            {editLoading ? (
                              <>
                                <span className="spinner"></span>Guardando
                                cambios...
                              </>
                            ) : (
                              <>
                                <span className="btn-icon">💾</span>Guardar
                                Cambios
                              </>
                            )}
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditForm({
                                selectedPaymentId: "",
                                editAmount: "",
                                editIncomeMethod: "CASH",
                              });
                              setEditError("");
                              setEditSuccess("");
                            }}
                            disabled={editLoading}
                            style={{ marginTop: "8px" }}
                          >
                            <span className="btn-icon">↩️</span>Descartar
                            cambios
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="participant-detail-modal__actions">
          <button className="btn btn-secondary" onClick={onClose}>
            <span className="btn-icon">←</span>Volver a la Lista
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
          {activeTab === "editContribution" &&
            canEdit &&
            editForm.selectedPaymentId && (
              <button
                className="btn btn-primary"
                onClick={handleEditPayment}
                disabled={editLoading}
              >
                {editLoading ? "Guardando..." : "💾 Guardar Cambios"}
              </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantDetailModal;
