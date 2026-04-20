// ============================================
// ParticipantDetailModal.jsx - ELITE MODERN EDITION
// ============================================
import React, { useState, useContext, useEffect, useCallback } from "react";
import { 
  X, 
  User, 
  Users, 
  MapPin, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Package, 
  Edit3, 
  Save,
  Plus, 
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Loader2,
  Ban,
  ArrowLeft
} from 'lucide-react';
import { useConfirmation } from "../context/ConfirmationContext";
import apiService from "../apiService";
import AuthContext from "../context/AuthContext";
import { generateParticipantsPDF } from "../services/participantsPdfGenerator";
import {
  transformForDisplay,
  transformArrayForDisplay,
} from "../services/nameHelper";
import ItemDeliveryToggle from "./ItemDeliveryToggle";

// ─── Helper: ¿la actividad sigue abierta para editar? ─────────────────────────
const isActivityEditable = (endDate) => {
  if (!endDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = endDate.toString().split("T")[0].split("-").map(Number);
  const end = new Date(year, month - 1, day);
  end.setHours(0, 0, 0, 0);
  return end >= today;
};

// Mapa de estados de inscripción
const ENROLLMENT_STATUS_MAP = {
  COMPLETED: { label: 'Completado', color: 'emerald', icon: <CheckCircle2 size={14} /> },
  ACTIVE: { label: 'Activo', color: 'blue', icon: <TrendingUp size={14} /> },
  PENDING: { label: 'Pendiente', color: 'amber', icon: <Clock size={14} /> },
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
  const confirm = useConfirmation();
  const { user } = useContext(AuthContext);
  
  // Estados de tabs
  const [activeTab, setActiveTab] = useState("details");
  
  // Estados del formulario de pago
  const [paymentAmount, setPaymentAmount] = useState("");
  const [incomeMethod, setIncomeMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  
  // Estados generales
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [memberDetails, setMemberDetails] = useState(null);
  const [contributionData, setContributionData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [itemDelivered, setItemDelivered] = useState(
    contribution?.itemDelivered ?? participant?.itemDelivered ?? false,
  );
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  // Estados de la pestaña de detalles
  const [detailError, setDetailError] = useState("");
  const [detailSuccess, setDetailSuccess] = useState("");

  // ─── Estado del formulario de edición de abono ────────────────────────────
  const [editForm, setEditForm] = useState({
    selectedPaymentId: "",
    editAmount: "",
    editIncomeMethod: "CASH",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [editingQty, setEditingQty] = useState(false);
  const [newQty, setNewQty] = useState(1);
  const [savingQty, setSavingQty] = useState(false);
  const [qtyError, setQtyError] = useState("");
  const [qtySuccess, setQtySuccess] = useState("");

  // ─── getRecordedBy ───────────────────────────────────────────────────────
  const getRecordedBy = useCallback(() => {
    if (currentUserInfo?.name) return currentUserInfo.name;
    const storedName = localStorage.getItem("username") || localStorage.getItem("userName") || sessionStorage.getItem("username");
    return storedName || "Usuario Sistema";
  }, [currentUserInfo]);

  // ─── Obtener información del usuario ─────────────────────────────────────
  useEffect(() => {
    const getUserInfo = () => {
      if (user?.name || user?.username) {
        return { name: user.name || user.username, email: user.email, id: user.id };
      }
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.name || parsedUser.username) {
            return { name: parsedUser.name || parsedUser.username, email: parsedUser.email, id: parsedUser.id };
          }
        }
      } catch (e) { console.error("Error parsing stored user:", e); }
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (token) {
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
          const payload = JSON.parse(jsonPayload);
          return { name: payload.name || payload.sub || payload.username, email: payload.email, id: payload.id || payload.sub };
        }
      } catch (e) { console.error("Error decoding token:", e); }
      const username = localStorage.getItem("username") || localStorage.getItem("userName") || sessionStorage.getItem("username");
      if (username) return { name: username, email: "", id: localStorage.getItem("userId") || 1 };
      return { name: "Administrador", email: "admin@iglesia.com", id: 1 };
    };
    setCurrentUserInfo(getUserInfo());
  }, [user]);

  // ─── Obtener datos del miembro ───────────────────────────────────────────
  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (!participant?.memberId) return;
      try {
        const memberData = await apiService.request(`/member/find/${participant.memberId}`);
        const transformedMemberData = transformForDisplay(memberData, ["name"]);
        setMemberDetails(transformedMemberData);
      } catch (error) {
        console.error("Error obteniendo detalles del miembro:", error);
      }
    };
    if (isOpen && participant?.memberId) fetchMemberDetails();
  }, [isOpen, participant?.memberId]);

  // ─── Cargar historial de pagos ───────────────────────────────────────────
  const fetchPaymentHistory = useCallback(async () => {
    const contributionId = contribution?.id || participant.contributionId;
    if (!contributionId) return;
    try {
      const payments = await apiService.request(`/activity-payment/contribution/${contributionId}`, { method: "GET" });
      const formattedPayments = Array.isArray(payments) ? payments.map((payment) => ({
        id: payment.id,
        amount: payment.price,
        date: payment.registrationDate,
        incomeMethod: payment.incomeMethod,
        recordedBy: payment.recordedBy,
        memberName: payment.memberName,
        memberId: payment.memberId,
      })) : [];
      const transformedPayments = transformArrayForDisplay(formattedPayments, ["memberName"]);
      setPaymentHistory(transformedPayments);
      const totalPaid = transformedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const qty = contribution?.quantity || participant?.quantity || 1;
      const unitPrice = activity?.price || 0;
      const expectedTotal = unitPrice * qty;
      const totalPrice = participant?.totalPrice >= expectedTotal ? participant.totalPrice : contribution?.totalPrice >= expectedTotal ? contribution.totalPrice : expectedTotal;
      const pendingBalance = Math.max(0, totalPrice - totalPaid);
      const isFullyPaid = pendingBalance <= 0;
      const enrollmentStatus = isFullyPaid ? "COMPLETED" : totalPaid > 0 ? "ACTIVE" : "PENDING";
      setContributionData((prev) => ({
        ...prev,
        totalPaid,
        pendingBalance,
        isFullyPaid,
        enrollmentStatus,
        quantity: qty,
        totalPrice,
        paymentHistory: transformedPayments,
      }));
    } catch (err) {
      console.error("❌ Error cargando historial de pagos:", err);
      setPaymentHistory([]);
    }
  }, [contribution?.id, participant.contributionId, activity?.price, contribution?.quantity, participant?.quantity, participant?.totalPrice, contribution?.totalPrice]);

  // ─── Efectos iniciales ───────────────────────────────────────────────────
  useEffect(() => {
    setItemDelivered(contribution?.itemDelivered ?? participant?.itemDelivered ?? false);
    if (isOpen) fetchPaymentHistory();
  }, [isOpen, contribution, participant, fetchPaymentHistory]);

  useEffect(() => {
    if (activeTab === "editContribution") {
      setEditForm({ selectedPaymentId: "", editAmount: "", editIncomeMethod: "CASH" });
      setEditError("");
      setEditSuccess("");
      fetchPaymentHistory();
    }
    // Limpiar errores al cambiar de pestaña
    if (activeTab === "addPayment") {
      setPaymentError("");
      setPaymentSuccess("");
    }
    if (activeTab === "details") {
      setDetailError("");
      setDetailSuccess("");
    }
  }, [activeTab, fetchPaymentHistory]);

  // ─── Recargar datos de contribución ──────────────────────────────────────
  const refreshContributionData = async () => {
    const contributionId = contribution?.id || participant.contributionId;
    if (!contributionId) return;
    setRefreshing(true);
    try {
      await fetchPaymentHistory();
      try {
        const updatedContribution = await apiService.request(`/activity-payment/contribution/${contributionId}`, { method: "GET" });
        const transformedContribution = transformForDisplay(updatedContribution, ["memberName"]);
        setContributionData((prev) => ({ ...prev, ...transformedContribution }));
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

  // ─── Guardar edición del abono ───────────────────────────────────────────
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
      const result = await apiService.request(`/activity-payment/update/${editForm.selectedPaymentId}`, {
        method: "PATCH",
        body: JSON.stringify({ amount: parseFloat(editForm.editAmount), incomeMethod: editForm.editIncomeMethod }),
      });
      await refreshContributionData();
      if (onAddPaymentSuccess) onAddPaymentSuccess({ type: "editPayment", apiResponse: result });
      setEditSuccess("✅ Abono actualizado correctamente.");
      setEditForm({ selectedPaymentId: "", editAmount: "", editIncomeMethod: "CASH" });
      setTimeout(() => setEditSuccess(""), 3500);
    } catch (err) {
      if (err.status === 403) {
        setEditError("⛔ La actividad ya cerró. No se pueden editar abonos.");
      } else if (err.status === 400 && err.data?.error?.includes("excede el saldo")) {
        const maxAllowed = err.data?.maxAllowed;
        const unitPrice = err.data?.unitPrice;
        const quantity = err.data?.quantity;
        const totalPrice = err.data?.totalPrice;
        setEditError(`❌ El monto excede el saldo disponible.\n💰 Precio unitario: $${unitPrice?.toLocaleString("es-CO") || "N/A"}\n📦 Cantidad: ${quantity || "N/A"} unidades\n💵 Total a pagar: $${totalPrice?.toLocaleString("es-CO") || "N/A"}\n✅ Máximo permitido: $${maxAllowed?.toLocaleString("es-CO") || "N/A"}`);
      } else {
        const msg = err.data?.error || err.message || "Error al actualizar el abono.";
        setEditError(`❌ ${msg}`);
      }
    } finally {
      setEditLoading(false);
    }
  };

  // ─── Generar PDF ─────────────────────────────────────────────────────────
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const updatedData = await refreshContributionData();
      const pdfData = {
        activity: { name: activity.activityName || "Actividad sin nombre", price: activity.price || 0, quantity: activity.quantity || 0, endDate: activity.endDate, isActive: activity.isActive },
        participants: [{ ...participant, totalPaid: updatedData?.totalPaid || totalPaid, pendingBalance: updatedData?.pendingBalance || pendingBalance, isFullyPaid: updatedData?.isFullyPaid || isFullyPaid, paymentHistory: paymentHistory, leaderName: leaderName, districtName: districtName, enrollmentStatus: participant.enrollmentStatus, registrationDate: participant.registrationDate, memberName: participant.memberName }],
        statistics: { total: 1, fullyPaid: isFullyPaid ? 1 : 0, partiallyPaid: !isFullyPaid && totalPaid > 0 ? 1 : 0, pending: pendingBalance > 0 ? 1 : 0, totalPaid: totalPaid, percentagePaid: Math.round(compliancePercentage) },
        filters: { searchText: participant.memberName || "", leaderFilter: leaderName || "", districtFilter: districtName || "" },
      };
      const filename = `detalle-participante-${participant.memberName?.toLowerCase().replace(/\s+/g, "-") || "participante"}-${new Date().toISOString().split("T")[0]}`;
      const successResult = await generateParticipantsPDF(pdfData, filename);
      if (successResult) {
        setDetailSuccess("✅ PDF generado exitosamente");
        setTimeout(() => setDetailSuccess(""), 3000);
      }
    } catch (error) {
      console.error("Error generando PDF:", error);
      await confirm({ title: "Error de Exportación", message: "No se pudo generar el PDF del participante. Verifique los datos e intente nuevamente.", type: "error", confirmLabel: "Cerrar" });
      setTimeout(() => setDetailError(""), 3000);
    } finally {
      setGeneratingPDF(false);
    }
  };

  // ─── Cambio de entrega ───────────────────────────────────────────────────
  const handleDeliveryChange = useCallback((contributionId, newValue) => {
    setItemDelivered(newValue);
    if (onAddPaymentSuccess) onAddPaymentSuccess({ type: "deliveryChange", contributionId, itemDelivered: newValue, delivered: newValue, isDelivered: newValue, item_delivered: newValue });
  }, [onAddPaymentSuccess]);

  // ─── Guardar nueva cantidad ──────────────────────────────────────────────
  const handleSaveQuantity = async () => {
    const qty = parseInt(newQty);
    if (!qty || qty < 1) {
      setQtyError("La cantidad mínima es 1.");
      return;
    }
    const contributionId = contribution?.id || participant?.contributionId;
    if (!contributionId) {
      setQtyError("No se encontró el ID de la contribución.");
      return;
    }
    setSavingQty(true);
    setQtyError("");
    setQtySuccess("");
    try {
      await apiService.request(`/activity-contribution/update/${contributionId}`, { method: "PATCH", body: JSON.stringify({ quantity: qty }) });
      setQtySuccess(`✅ Cantidad actualizada a ${qty} unidad${qty !== 1 ? "es" : ""}.`);
      setEditingQty(false);
      await refreshContributionData();
      if (onAddPaymentSuccess) onAddPaymentSuccess({ type: "quantityChange", quantity: qty });
      setTimeout(() => setQtySuccess(""), 3500);
    } catch (err) {
      if (err.status === 400) {
        setQtyError(err.data?.error || "No se puede cambiar la cantidad en actividades ENROLLMENT.");
      } else if (err.status === 403) {
        setQtyError("La actividad ya cerró. No se puede cambiar la cantidad.");
      } else {
        setQtyError(err.data?.error || err.message || "Error al actualizar la cantidad.");
      }
    } finally {
      setSavingQty(false);
    }
  };

  // ─── Agregar pago ────────────────────────────────────────────────────────
  const handleAddPayment = async () => {
    const amountNum = parseFloat(paymentAmount);
    
    if (!paymentAmount || isNaN(amountNum) || amountNum <= 0) {
      setPaymentError("El monto debe ser mayor a cero");
      return;
    }
    
    if (amountNum > pendingBalance) {
      setPaymentError(`El monto excede el saldo pendiente ($${pendingBalance.toLocaleString("es-CO")})`);
      return;
    }
    
    const recordedByName = getRecordedBy();
    if (!recordedByName || recordedByName === "Usuario Sistema") {
      setPaymentError("No se pudo obtener información del usuario logueado. Por favor, inicie sesión.");
      return;
    }
    
    const contributionId = contribution?.id || participant.contributionId;
    if (!contributionId) {
      setPaymentError("Error: No se encontró el ID de contribución.");
      return;
    }
    
    setLoading(true);
    setPaymentError("");
    setPaymentSuccess("");
    
    try {
      const paymentData = { amount: amountNum, incomeMethod, recordedBy: recordedByName };
      const result = await apiService.request(
        `/activity-payment/add-payment/${contributionId}`,
        { method: "POST", body: JSON.stringify(paymentData) }
      );
      
      await refreshContributionData();
      
      if (onAddPaymentSuccess) {
        onAddPaymentSuccess({
          contributionId,
          amount: amountNum,
          incomeMethod,
          recordedBy: recordedByName,
          apiResponse: result,
          updatedContribution: result,
        });
      }
      
      setPaymentSuccess(result.message || "✅ Pago registrado exitosamente");
      setPaymentAmount("");
      
      const newPendingBalance = result.pendingBalance || pendingBalance - amountNum;
      if (newPendingBalance <= 0) {
        setTimeout(() => onClose(), 2000);
      } else {
        setTimeout(() => setPaymentSuccess(""), 3000);
      }
    } catch (err) {
      let errorMessage = "Error al registrar el pago";
      let errorData = err.data || err.response?.data || {};
      
      if (err.data) errorData = err.data;
      const errorString = JSON.stringify(errorData).toLowerCase();
      
      if (errorString.includes("email") && (errorString.includes("obligatorio") || errorString.includes("required"))) {
        const memberName = participant.memberName || "El miembro";
        setPaymentError(`${memberName} no tiene un email registrado en el sistema. Para poder completar el pago, primero debe actualizar los datos del miembro con un correo electrónico válido.`);
      } else if (err.status === 404 || errorString.includes("404")) {
        setPaymentError("❌ El endpoint no existe");
      } else if (err.message?.includes("Failed to fetch") || err.status === 0) {
        setPaymentError("🌐 Error de conexión con el servidor");
      } else {
        setPaymentError(`❌ ${errorData.message || errorData.error || errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Formatear fecha ─────────────────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return dateString; }
  };

  if (!isOpen || !participant || !activity) return null;

  // ─── Variables calculadas ────────────────────────────────────────────────
  const rawLeaderName = memberDetails?.leader?.name || participant.leader?.name || participant.leaderName;
  const leaderName = rawLeaderName ? transformForDisplay({ name: rawLeaderName }, ["name"]).name : "Sin líder asignado";
  const districtName = memberDetails?.district || memberDetails?.district?.districtName || memberDetails?.district?.name || participant.district || participant.district?.districtName || participant.districtName || "Sin distrito";
  const currentData = contributionData || contribution || participant;
  const quantity = currentData?.quantity || participant?.quantity || 1;
  const unitPrice = activity?.price || 0;
  const expectedTotal = unitPrice * quantity;
  const totalPaid = contributionData?.totalPaid ?? participant.totalPaid ?? 0;
  const pendingBalance = Math.max(0, expectedTotal - totalPaid);
  const isFullyPaid = contributionData?.isFullyPaid ?? participant.isFullyPaid ?? false;
  const activityPrice = currentData?.totalPrice && currentData.totalPrice >= expectedTotal ? currentData.totalPrice : participant?.totalPrice && participant.totalPrice >= expectedTotal ? participant.totalPrice : expectedTotal;
  const compliancePercentage = activityPrice > 0 ? (totalPaid / activityPrice) * 100 : 0;
  const isStandalone = activity?.activityType === "STANDALONE";
  const currentPaymentHistory = paymentHistory.length > 0 ? paymentHistory : currentData?.paymentHistory || participant.paymentHistory || [];
  const canEdit = isActivityEditable(activity?.endDate);
  const endDateFormatted = activity?.endDate ? (() => { const [year, month, day] = activity.endDate.toString().split("T")[0].split("-").map(Number); return new Date(year, month - 1, day).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }); })() : null;
  const hasContributionData = currentData || (participant && participant.memberId);
  const selectedPayment = editForm.selectedPaymentId ? currentPaymentHistory.find((p) => String(p.id) === String(editForm.selectedPaymentId)) : null;
  const statusInfo = ENROLLMENT_STATUS_MAP[contributionData?.enrollmentStatus] || ENROLLMENT_STATUS_MAP.PENDING;

  return (
    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-0 md:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose}>
      <div className="relative w-full min-h-full md:min-h-0 md:h-auto md:max-h-[90vh] max-w-5xl bg-white dark:bg-slate-900 rounded-none md:rounded-[3rem] shadow-2xl border-none md:border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row overflow-visible md:overflow-hidden animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
        
        {/* Left Side: Avatar & Core Info */}
        <div className="w-full md:w-[380px] bg-slate-50 dark:bg-slate-950/50 border-r border-slate-100 dark:border-slate-800 p-6 md:p-8 flex flex-col overflow-visible md:overflow-y-auto custom-scrollbar shrink-0">
          <div className="flex justify-between items-center mb-10 md:hidden">
            <h2 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">Detalles del Participante</h2>
            <button onClick={onClose} className="p-2 text-slate-400"><X size={24} /></button>
          </div>

          <div className="relative mx-auto mb-8">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
            <div className={`w-36 h-36 rounded-[3rem] bg-gradient-to-br transition-all duration-700 ${isFullyPaid ? 'from-emerald-600 to-teal-700' : 'from-blue-600 to-indigo-700'} flex items-center justify-center text-white shadow-2xl rotate-3 relative z-10`}>
              <span className="text-6xl font-black tracking-tighter -rotate-3">{participant.memberName?.[0]?.toUpperCase()}</span>
            </div>
            <div className="absolute -bottom-2 -right-2 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-slate-100 dark:border-slate-700 z-20">
              <ShieldCheck size={24} className="animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-4 mb-10">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none px-4 line-clamp-2">{participant.memberName}</h3>
            <div className="flex flex-col items-center gap-3">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${
                statusInfo.color === 'emerald' 
                  ? 'border-emerald-100 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' 
                  : statusInfo.color === 'blue' 
                    ? 'border-blue-100 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
                    : 'border-amber-100 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
              } text-[10px] font-black uppercase tracking-[0.2em] shadow-sm`}>
                {statusInfo.icon} {statusInfo.label}
              </div>
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${isFullyPaid ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'} text-[10px] font-black uppercase tracking-[0.2em] border border-transparent`}>
                <span className={`w-2 h-2 rounded-full ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                {isFullyPaid ? 'Pagado' : `Saldo: $${pendingBalance.toLocaleString("es-CO")}`}
              </div>
            </div>
          </div>

          <div className="space-y-6 mt-auto">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><Users size={18} /></div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Líder Ministerial</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{leaderName}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><MapPin size={18} /></div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Distrito</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">{districtName}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><Calendar size={18} /></div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fecha Inscripción</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">{formatDate(participant.registrationDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Content & Actions */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 relative">
          
          {/* Header Controls */}
          <div className="px-6 md:px-10 py-4 md:py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0 z-10">
            {/* MODIFICACIÓN UX: md:overflow-visible y md:flex-wrap eliminan el scroll innecesario en escritorio */}
            <div className="flex gap-2 md:gap-2 overflow-x-auto md:overflow-visible ">
              {[
                { id: 'details', label: 'Detalles', icon: <User size={14} /> },
                { id: 'addPayment', label: 'Agregar Pago', icon: <Plus size={14} />, disabled: isFullyPaid },
                { id: 'editContribution', label: 'Editar Abono', icon: canEdit ? <Edit3 size={14} /> : <Ban size={14} />, disabled: !canEdit }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  // MODIFICACIÓN UX: whitespace-nowrap previene que el texto colapse, permitiendo que el flex-wrap haga su trabajo si la pantalla se encoge
                  className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2 flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : tab.disabled 
                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-full animate-in slide-in-from-left-2 duration-300" />}
                </button>
              ))}
            </div>
            
            {/* MODIFICACIÓN UX: Se añade shrink-0 y ml-4 para que los botones de acción nunca peleen por el espacio de las pestañas */}
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button
                onClick={handleGeneratePDF}
                disabled={generatingPDF}
                className="p-3 text-slate-400 hover:text-blue-600 transition-all active:scale-95 hidden md:flex items-center gap-2"
              >
                {generatingPDF ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
              </button>
              <button onClick={onClose} className="p-3 text-slate-400 hover:text-red-500 transition-all active:scale-95 hidden md:block">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar p-6 md:p-10 relative">
            
            {/* ════ PESTAÑA: DETALLES ════════════════════════════════════════ */}
            {activeTab === "details" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {detailSuccess && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={20} />
                    <span className="text-sm font-bold">{detailSuccess}</span>
                  </div>
                )}
                {detailError && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
                    <AlertCircle size={20} />
                    <span className="text-sm font-bold">{detailError}</span>
                  </div>
                )}

                {!hasContributionData ? (
                  <div className="py-20 text-center space-y-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-[3rem] border border-dashed border-slate-200">
                    <Package size={48} className="mx-auto text-slate-400 opacity-20" />
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sin datos disponibles</p>
                    <p className="text-xs font-bold text-slate-500">No hay datos de contribución para este participante.</p>
                  </div>
                ) : (
                  <>
                    {/* Información de la Actividad */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 group hover:border-blue-500/30 transition-all">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <Sparkles size={14} className="text-blue-500" /> Información de la Actividad
                      </h4>
                      <div className="space-y-4 font-black">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                          <span className="text-xs text-slate-400 uppercase tracking-widest">Actividad</span>
                          <span className="text-sm text-slate-800 dark:text-white">{activity.activityName}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                          <span className="text-xs text-slate-400 uppercase tracking-widest">{quantity > 1 ? "Precio unitario" : "Precio"}</span>
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-black">${unitPrice.toLocaleString("es-CO")}{quantity > 1 && <span className="text-slate-400 text-xs ml-2">×{quantity} = ${activityPrice.toLocaleString("es-CO")}</span>}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-slate-400 uppercase tracking-widest">Registrado por</span>
                          <span className="text-sm text-slate-800 dark:text-white">{currentData?.recordedBy || participant.recordedBy || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cantidad de unidades (solo STANDALONE) */}
                    {isStandalone && (
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                          <Package size={14} className="text-blue-500" /> Cantidad de Unidades
                          {qtySuccess && <span className="text-emerald-500 text-xs ml-2">{qtySuccess}</span>}
                        </h4>
                        {!editingQty ? (
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-2">
                              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{quantity}</span>
                              <span className="text-xs font-bold text-slate-500">{quantity === 1 ? "unidad" : "unidades"}</span>
                            </div>
                            {quantity > 1 && (
                              <span className="text-xs font-bold text-slate-500">
                                ${unitPrice.toLocaleString("es-CO")} × {quantity} = <span className="text-blue-600">${activityPrice.toLocaleString("es-CO")}</span>
                              </span>
                            )}
                            {!readOnly && canEdit && (
                              <button onClick={() => { setNewQty(quantity); setEditingQty(true); setQtyError(""); }} className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors">
                                ✏️ Editar
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {qtyError && <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl text-red-600 text-xs font-bold">⚠️ {qtyError}</div>}
                            <div className="flex items-center gap-3 flex-wrap">
                              <input type="number" min="1" value={newQty} onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))} disabled={savingQty} className="w-24 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-center focus:border-blue-500 outline-none" />
                              <span className="text-xs font-bold text-slate-500">× ${unitPrice.toLocaleString("es-CO")} = <span className="text-blue-600">${(unitPrice * (parseInt(newQty) || 1)).toLocaleString("es-CO")}</span></span>
                            </div>
                            {(parseInt(newQty) || 1) < quantity && totalPaid > unitPrice * (parseInt(newQty) || 1) && (
                              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-amber-600 text-xs font-bold">⚠️ Los pagos registrados (${totalPaid.toLocaleString("es-CO")}) superan el nuevo precio total.</div>
                            )}
                            <div className="flex gap-3">
                              <button onClick={handleSaveQuantity} disabled={savingQty} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                                {savingQty ? <Loader2 size={14} className="animate-spin" /> : "Guardar"}
                              </button>
                              <button onClick={() => { setEditingQty(false); setQtyError(""); }} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Entrega del artículo */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <Package size={14} className="text-blue-500" /> Entrega del Artículo
                      </h4>
                      <ItemDeliveryToggle
                        contributionId={contribution?.id || participant?.contributionId}
                        initialDelivered={itemDelivered}
                        memberName={participant?.memberName}
                        onDeliveryChange={handleDeliveryChange}
                        disabled={readOnly}
                      />
                    </div>

                    {/* Resumen de Pagos */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] text-white">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-200">Resumen de Pagos</h4>
                        <DollarSign size={20} className="text-blue-200" />
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-blue-300">Total a Pagar</p>
                          <p className="text-2xl font-black">${activityPrice.toLocaleString("es-CO")}</p>
                          {quantity > 1 && <p className="text-[9px] text-blue-300">{quantity} unidades</p>}
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-blue-300">Pagado</p>
                          <p className="text-2xl font-black">${totalPaid.toLocaleString("es-CO")}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-blue-300">Pendiente</p>
                          <p className="text-2xl font-black">${pendingBalance.toLocaleString("es-CO")}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-200">Progreso</span>
                          <span className="font-black">{compliancePercentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-blue-500/30 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${Math.min(100, compliancePercentage)}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Historial de Pagos */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <FileText size={14} className="text-blue-500" /> Historial de Pagos ({currentPaymentHistory.length})
                      </h4>
                      {currentPaymentHistory.length > 0 ? (
                        <div className="space-y-3">
                          {currentPaymentHistory.map((payment, index) => (
                            <div key={payment.id || index} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                  <DollarSign size={18} />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-800 dark:text-white">${(payment.amount || 0).toLocaleString("es-CO")}</p>
                                  <p className="text-[9px] font-bold text-slate-400">{formatDate(payment.date || payment.registrationDate)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${payment.incomeMethod === "BANK_TRANSFER" ? "bg-purple-50 text-purple-600" : "bg-emerald-50 text-emerald-600"}`}>
                                  {payment.incomeMethod === "BANK_TRANSFER" ? "Transferencia" : "Efectivo"}
                                </span>
                                <p className="text-[9px] font-bold text-slate-400 mt-1">por {payment.recordedBy || "Sistema"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center">
                          <DollarSign size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                          <p className="text-xs font-bold text-slate-500">No hay pagos registrados</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ════ PESTAÑA: AGREGAR PAGO ════════════════════════════════════ */}
            {activeTab === "addPayment" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {paymentError && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <span className="text-sm font-bold whitespace-pre-line">{paymentError}</span>
                  </div>
                )}
                {paymentSuccess && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={20} />
                    <span className="text-sm font-bold">{paymentSuccess}</span>
                  </div>
                )}

                {/* Tarjeta de resumen financiero */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 rounded-[2rem] text-white">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-blue-300">Total</p>
                      <p className="text-2xl font-black">${activityPrice.toLocaleString("es-CO")}</p>
                      {quantity > 1 && <p className="text-[9px] text-blue-300">{quantity} × ${unitPrice.toLocaleString("es-CO")}</p>}
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-blue-300">Pagado</p>
                      <p className="text-2xl font-black">${totalPaid.toLocaleString("es-CO")}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-blue-300">Pendiente</p>
                      <p className="text-2xl font-black">${pendingBalance.toLocaleString("es-CO")}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-500/30">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-blue-200">Progreso</span>
                      <span className="font-black">{compliancePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-blue-500/30 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${Math.min(100, compliancePercentage)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Formulario de pago */}
                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                    <Plus size={14} className="text-blue-500" /> Registrar Nuevo Pago
                  </h4>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <DollarSign size={12} /> Monto a Pagar *
                      </label>
                      <div className="flex gap-3 flex-wrap">
                        <input
                          type="number"
                          placeholder="0"
                          value={paymentAmount}
                          onChange={(e) => {
                            setPaymentAmount(e.target.value);
                            setPaymentError("");
                          }}
                          disabled={loading || isFullyPaid}
                          min="0"
                          max={pendingBalance}
                          step="1000"
                          className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 font-black text-lg outline-none focus:border-blue-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentAmount(pendingBalance.toFixed(2));
                            setPaymentError("");
                          }}
                          disabled={isFullyPaid || pendingBalance <= 0}
                          className="px-6 py-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Pagar Todo
                        </button>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400">
                        Monto máximo: <span className="text-blue-600">${pendingBalance.toLocaleString("es-CO")}</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <CreditCard size={12} /> Método de Pago *
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setIncomeMethod("CASH")}
                          className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                            incomeMethod === "CASH"
                              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                              : "bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-100 dark:border-slate-800 hover:border-emerald-300"
                          }`}
                        >
                          💵 Efectivo
                        </button>
                        <button
                          type="button"
                          onClick={() => setIncomeMethod("BANK_TRANSFER")}
                          className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                            incomeMethod === "BANK_TRANSFER"
                              ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                              : "bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-100 dark:border-slate-800 hover:border-purple-300"
                          }`}
                        >
                          🏦 Transferencia
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <User size={12} /> Registrado por
                      </label>
                      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 text-[10px] font-black">
                          {getRecordedBy().charAt(0).toUpperCase()}
                        </div>
                        <span className="font-black text-slate-700 dark:text-slate-300">{getRecordedBy()}</span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400">Este campo se completa automáticamente</p>
                    </div>

                    <button
                      onClick={handleAddPayment}
                      disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || loading || isFullyPaid || pendingBalance <= 0}
                      className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Procesando Pago...
                        </>
                      ) : (
                        <>
                          <DollarSign size={18} />
                          Registrar Pago
                        </>
                      )}
                    </button>

                    {(isFullyPaid || pendingBalance <= 0) && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={20} />
                        <span className="text-sm font-bold">✅ Esta contribución ya ha sido pagada completamente</span>
                      </div>
                    )}

                    {!isFullyPaid && pendingBalance > 0 && !paymentAmount && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center gap-3 text-amber-600 dark:text-amber-400">
                        <AlertCircle size={20} />
                        <span className="text-sm font-bold">💡 Ingresa un monto para registrar el pago</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ════ PESTAÑA: EDITAR ABONO ════════════════════════════════════ */}
            {activeTab === "editContribution" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {!canEdit && (
                  <div className="p-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800 rounded-[2rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600"><Ban size={24} /></div>
                    <div>
                      <h5 className="text-sm font-black text-amber-800 dark:text-amber-400">Actividad Cerrada</h5>
                      <p className="text-xs font-bold text-amber-600/70">La fecha de cierre fue el {endDateFormatted}. Los abonos ya no pueden modificarse.</p>
                    </div>
                  </div>
                )}

                {canEdit && (
                  <>
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-[2rem] flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg"><Edit3 size={24} /></div>
                      <div>
                        <h5 className="text-sm font-black text-slate-900 dark:text-white">Edición de Abonos</h5>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/70">Modifica el monto o método de un pago existente</p>
                      </div>
                    </div>

                    {editError && (
                      <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <span className="text-sm font-bold whitespace-pre-line">{editError}</span>
                      </div>
                    )}
                    {editSuccess && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={20} />
                        <span className="text-sm font-bold">{editSuccess}</span>
                      </div>
                    )}

                    {currentPaymentHistory.length === 0 ? (
                      <div className="py-20 text-center space-y-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-[3rem] border border-dashed border-slate-200">
                        <DollarSign size={48} className="mx-auto text-slate-400 opacity-20" />
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sin abonos registrados</p>
                        <p className="text-xs font-bold text-slate-500">No hay abonos disponibles para editar.</p>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                              <FileText size={12} /> Seleccionar Abono *
                            </label>
                            <select
                              value={editForm.selectedPaymentId}
                              onChange={(e) => {
                                const pid = e.target.value;
                                const pago = currentPaymentHistory.find((p) => String(p.id) === pid);
                                setEditForm({
                                  selectedPaymentId: pid,
                                  editAmount: pago ? String(pago.amount) : "",
                                  editIncomeMethod: pago ? pago.incomeMethod : "CASH",
                                });
                                setEditError("");
                                setEditSuccess("");
                              }}
                              disabled={editLoading}
                              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 font-black outline-none focus:border-blue-500 transition-all"
                            >
                              <option value="">-- Selecciona un abono --</option>
                              {currentPaymentHistory.map((p, i) => (
                                <option key={p.id} value={p.id}>
                                  Abono #{i + 1} — ${(p.amount || 0).toLocaleString("es-CO")} — {formatDate(p.date)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {editForm.selectedPaymentId && selectedPayment && (
                            <>
                              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Abono Seleccionado</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div><span className="text-slate-500">Monto actual:</span> <span className="font-black">${selectedPayment.amount.toLocaleString("es-CO")}</span></div>
                                  <div><span className="text-slate-500">Método:</span> <span className="font-black">{selectedPayment.incomeMethod === "BANK_TRANSFER" ? "Transferencia" : "Efectivo"}</span></div>
                                  <div><span className="text-slate-500">Fecha:</span> <span className="font-black">{formatDate(selectedPayment.date)}</span></div>
                                  <div><span className="text-slate-500">Registrado por:</span> <span className="font-black">{selectedPayment.recordedBy || "Sistema"}</span></div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                  <DollarSign size={12} /> Nuevo Monto *
                                </label>
                                <input
                                  type="number"
                                  value={editForm.editAmount}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, editAmount: e.target.value }))}
                                  disabled={editLoading}
                                  min="1"
                                  placeholder="0"
                                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 font-black text-lg outline-none focus:border-blue-500 transition-all"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                  <CreditCard size={12} /> Método de Pago *
                                </label>
                                <div className="flex gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setEditForm((prev) => ({ ...prev, editIncomeMethod: "CASH" }))}
                                    className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                      editForm.editIncomeMethod === "CASH"
                                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                                        : "bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-100 dark:border-slate-800"
                                    }`}
                                  >
                                    💵 Efectivo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditForm((prev) => ({ ...prev, editIncomeMethod: "BANK_TRANSFER" }))}
                                    className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                      editForm.editIncomeMethod === "BANK_TRANSFER"
                                        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                                        : "bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-100 dark:border-slate-800"
                                    }`}
                                  >
                                    🏦 Transferencia
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                  <User size={12} /> Registrado por
                                </label>
                                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 text-[10px] font-black">
                                    {getRecordedBy().charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-black text-slate-700 dark:text-slate-300">{getRecordedBy()}</span>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400">Este campo se completa automáticamente</p>
                              </div>

                              <div className="flex gap-4 pt-4">
                                <button
                                  onClick={handleEditPayment}
                                  disabled={editLoading || !editForm.selectedPaymentId}
                                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                                >
                                  {editLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                  {editLoading ? "Guardando..." : "Guardar Cambios"}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditForm({ selectedPaymentId: "", editAmount: "", editIncomeMethod: "CASH" });
                                    setEditError("");
                                    setEditSuccess("");
                                  }}
                                  disabled={editLoading}
                                  className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                  Descartar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDetailModal;