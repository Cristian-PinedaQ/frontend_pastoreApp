import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import apiService from "../apiService";
import { useConfirmation } from "../context/ConfirmationContext";
import ActivityDeliveryStats from "./ActivityDeliveryStats";
import { generateActivityPDF } from "../services/activityDetailsPdfGenerator";
import {
  X,
  Info,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Search,
  Clock,
  Tag,
  Download,
  Wallet,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Trash2,
  FileText,
  UserPlus,
  CreditCard,
  RefreshCw,
  Banknote,
  Building2,
} from "lucide-react";

// ✅ FIX timezone helpers
const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = String(dateString)
    .split("T")[0]
    .split("-")
    .map(Number);
  return new Date(year, month - 1, day);
};

const formatLocalDate = (dateString) => {
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ModalActivityDetails = ({
  isOpen,
  onClose,
  activity,
  balance,
  onEnrollParticipant,
  readOnly = false,
}) => {
  const confirm = useConfirmation();
  const [activeTab, setActiveTab] = useState("info");
  const EXCLUDED_MEMBER_IDS = useRef([1, 2]);

  // ── Member & Level States ─────────────────────────────────────────────────
  const [members, setMembers] = useState([]);
  const [levels, setLevels] = useState([]);

  // ✅ FIX #1: eligibleMembers se calcula y almacena correctamente
  const [eligibleMembers, setEligibleMembers] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // ── Enrollment States ─────────────────────────────────────────────────────
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [initialPayment, setInitialPayment] = useState("");
  const [incomeMethod, setIncomeMethod] = useState("CASH");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");

  // ✅ FIX #4: quantity solo aplica para STANDALONE
  const isStandalone = activity?.activityType === "STANDALONE";
  const [quantity, setQuantity] = useState(1);

  // ── Costs States ──────────────────────────────────────────────────────────
  const [costs, setCosts] = useState([]);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [costForm, setCostForm] = useState({
    detail: "",
    price: "",
    incomeMethod: "CASH",
  });
  const [savingCost, setSavingCost] = useState(false);

  // ── Participants State ────────────────────────────────────────────────────
  const [participants, setParticipants] = useState([]);

  const dropdownRef = useRef(null);
  const scrollRef = useRef(null);

  // ── Data Sync ─────────────────────────────────────────────────────────────

  // Carga participantes con sus pagos al abrir
  useEffect(() => {
    if (isOpen && activity?.id) {
      apiService
        .request(
          `/activity-contribution/activity/${activity.id}/with-leader-info`
        )
        .then(async (data) => {
          const parts = data || [];
          const partsWithPayments = await Promise.all(
            parts.map(async (p) => {
              try {
                const contId = p.id || p.contributionId;
                if (!contId) return { ...p, payments: [] };
                const payments = await apiService.request(
                  `/activity-payment/contribution/${contId}`
                );
                return { ...p, payments: payments || [] };
              } catch {
                return { ...p, payments: [] };
              }
            })
          );
          setParticipants(partsWithPayments);
        })
        .catch(() => setParticipants([]));
    }
    if (isOpen) {
      setActiveTab("info");
      setQuantity(1);
      setEnrollError("");
      setEnrollSuccess("");
    }
  }, [isOpen, activity?.id]);

  // Carga miembros y niveles en paralelo
  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const [membersRes, levelsRes] = await Promise.all([
        apiService.getAllMembers(),
        apiService.getActiveLevels(),
      ]);
      setMembers(membersRes || []);
      setLevels(levelsRes || []);
    } catch (err) {
      console.error("Error cargando miembros/niveles:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !readOnly) loadMembers();
  }, [isOpen, readOnly, loadMembers]);

  // ✅ FIX #1: Calcula y actualiza eligibleMembers cuando cambian members/levels/activity
  const isMemberEligible = useCallback(
    (member) => {
      if (EXCLUDED_MEMBER_IDS.current.includes(member.id)) return false;
      if (!activity?.requiredLevel) return true;
      if (activity.requiredLevel.code === "PREENCUENTRO") return true;
      if (!member.currentLevel) return false;
      const reqL = levels.find((l) => l.code === activity.requiredLevel.code);
      const memL = levels.find((l) => l.code === member.currentLevel.code);
      if (!reqL || !memL) return false;
      const prevOrder = reqL.levelOrder - 1;
      return prevOrder < 1 || memL.levelOrder === prevOrder;
    },
    [activity, levels]
  );

  useEffect(() => {
    if (members.length > 0 && levels.length > 0) {
      setEligibleMembers(members.filter(isMemberEligible));
    }
  }, [members, levels, isMemberEligible]);

  // Dropdown filtrado (máx 10 resultados)
  const filteredDropdown = useMemo(() => {
    const base = eligibleMembers;
    if (!searchTerm.trim()) return base.slice(0, 10);
    return base
      .filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 10);
  }, [eligibleMembers, searchTerm]);

  // ── Costs ─────────────────────────────────────────────────────────────────

  const loadCosts = useCallback(async () => {
    if (!activity?.id) return;
    setLoadingCosts(true);
    try {
      const res = await apiService.request(`/cost/activity/${activity.id}`);
      setCosts(res || []);
    } catch {
      setCosts([]);
    } finally {
      // ✅ FIX #2: era setLoadingCosts(true) — bug corregido
      setLoadingCosts(false);
    }
  }, [activity?.id]);

  // ✅ FIX #3: Carga costos al cambiar a la pestaña de costos
  useEffect(() => {
    if (activeTab === "costs" && !readOnly) {
      loadCosts();
    }
  }, [activeTab, loadCosts, readOnly]);

  // ── Click outside dropdown ────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Computed values ───────────────────────────────────────────────────────
  const totalPossibleValue = (activity?.price || 0) * (activity?.quantity || 0);
  const totalPriceForQuantity = (activity?.price || 0) * quantity;
  const enrolledCount = balance?.participantCount || 0;
  const hasCapacity =
    !activity?.quantity || enrolledCount < activity?.quantity;
  const daysLeft = activity?.endDate
    ? Math.ceil(
        (parseLocalDate(activity.endDate) - new Date()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  // Totales por método de pago (desde payments individuales)
  const totalCASH = participants.reduce(
    (s, p) =>
      s +
      (p.payments
        ?.filter((py) => py.incomeMethod === "CASH")
        .reduce((ps, py) => ps + (py.price || 0), 0) || 0),
    0
  );
  const totalBANK = participants.reduce(
    (s, p) =>
      s +
      (p.payments
        ?.filter((py) => py.incomeMethod === "BANK_TRANSFER")
        .reduce((ps, py) => ps + (py.price || 0), 0) || 0),
    0
  );
  const totalCosts = costs.reduce((s, c) => s + (c.price || 0), 0);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleEnroll = async () => {
    if (!selectedMember) return setEnrollError("Selecciona un miembro");

    if (showPaymentSection) {
      const pay = parseFloat(initialPayment);
      if (!pay || pay <= 0) return setEnrollError("Pago inválido");
      if (pay > totalPriceForQuantity)
        return setEnrollError(
          `El pago no puede exceder el total ($${totalPriceForQuantity.toLocaleString("es-CO")})`
        );
      if (!incomeMethod) return setEnrollError("Selecciona un método de pago");
    }

    setEnrolling(true);
    setEnrollError("");
    setEnrollSuccess("");

    try {
      const success = await onEnrollParticipant(
        activity.id,
        selectedMember.id,
        showPaymentSection ? parseFloat(initialPayment) : 0,
        incomeMethod,
        isStandalone ? quantity : 1 // ✅ FIX #4: quantity solo aplica para STANDALONE
      );

      if (success) {
        const msg = showPaymentSection
          ? `✅ Inscrito con pago de $${parseFloat(initialPayment).toLocaleString("es-CO")}${isStandalone && quantity > 1 ? ` (x${quantity})` : ""}`
          : `✅ Inscrito exitosamente${isStandalone && quantity > 1 ? ` (x${quantity})` : ""} (pago pendiente)`;

        setEnrollSuccess(msg);
        setSelectedMember(null);
        setSearchTerm("");
        setShowPaymentSection(false);
        setInitialPayment("");
        setIncomeMethod("CASH");
        setQuantity(1);

        // Recarga miembros y participantes sin cerrar el modal
        setTimeout(() => {
          loadMembers();
          apiService
            .request(
              `/activity-contribution/activity/${activity.id}/with-leader-info`
            )
            .then((data) => setParticipants(data || []))
            .catch(() => {});
          setEnrollSuccess("");
        }, 2000);
      }
    } catch (err) {
      setEnrollError(err.message || "Error al inscribir participante");
    } finally {
      setEnrolling(false);
    }
  };

  const handleSaveCost = async () => {
    if (!costForm.detail.trim() || !costForm.price || parseFloat(costForm.price) <= 0) {
      return confirm({
        title: "Datos Incompletos",
        message: "Por favor, ingresa el detalle y el valor del egreso.",
        type: "info",
      });
    }
    setSavingCost(true);
    try {
      const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
      const res = await apiService.request("/cost/save", {
        method: "POST",
        body: JSON.stringify({
          detail: costForm.detail.trim(),
          price: parseFloat(costForm.price),
          incomeMethod: costForm.incomeMethod,
          activityId: activity.id,
          fecha: new Date().toISOString(),
          recordedBy: currentUser?.username || "Sistema",
        }),
      });
      if (res) {
        setCostForm({ detail: "", price: "", incomeMethod: "CASH" });
        loadCosts();
      }
    } catch (err) {
      console.error("Error guardando costo:", err);
    } finally {
      setSavingCost(false);
    }
  };

  const handleDeleteCost = async (costId) => {
    await confirm({
      title: "¿Eliminar Egreso?",
      message:
        "¿Estás seguro de que deseas eliminar este registro? Esta acción es irreversible.",
      type: "danger",
      confirmLabel: "Eliminar Registro",
      onConfirm: async () => {
        await apiService.request(`/cost/delete/${costId}`, {
          method: "DELETE",
        });
        loadCosts();
      },
    });
  };

  const handlePrintPDF = () => {
    generateActivityPDF({
      activity,
      balance,
      participants,
      totalCASH,
      totalBANK,
      totalValue: totalPossibleValue,
    });
  };

  // ✅ FIX #5: Verifica estado de la actividad para habilitar inscripción
  const canEnroll = activity?.isActive === true;
  if (!isOpen || !activity) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="bg-slate-50 dark:bg-slate-950 w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[3.5rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.5)] border-x-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="p-6 sm:p-10 pb-4 sm:pb-6 relative overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="absolute top-0 right-0 w-40 sm:w-80 h-40 sm:h-80 bg-indigo-500/5 rounded-full -mr-16 sm:-mr-32 -mt-16 sm:-mt-32 blur-2xl sm:blur-3xl" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 relative z-10">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-900 dark:bg-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-500 shadow-2xl">
                <FileText size={24} className="sm:w-8 sm:h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 sm:gap-3 mb-1">
                  <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/20">
                    {activity.activityType === "ENROLLMENT"
                      ? "VINCULADO RAÍZ VIVA"
                      : "ACTIVIDAD INDEPENDIENTE"}
                  </span>
                  <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    ID #{activity.id}
                  </span>
                </div>
                <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight uppercase">
                  {activity.activityName}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
              {readOnly && (
                <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck size={14} />
                  <span className="hidden xs:inline">Solo Lectura</span>
                </div>
              )}
              {/* Nivel requerido en el header */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <Tag size={12} />
                {activity.requiredLevel?.displayName ||
                  activity.requiredLevel?.code ||
                  "Libre"}
              </div>
              <button
                onClick={onClose}
                className="p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg sm:rounded-2xl transition-all hover:rotate-90"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* ── TABS ───────────────────────────────────────────────────────── */}
        <div className="px-6 sm:px-10 flex gap-2 sm:gap-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: "info", label: "Dashboard", icon: TrendingUp },
            { id: "enroll", label: "Vincular", icon: UserPlus, hidden: readOnly },
            { id: "costs", label: "Egresos", icon: Wallet, hidden: readOnly },
          ].map(
            (tab) =>
              !tab.hidden && (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-4 sm:py-5 rounded-t-2xl sm:rounded-t-[2rem] text-[9px] sm:text-xs font-black uppercase tracking-widest transition-all translate-y-[1px] border-x border-t border-transparent shrink-0 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <tab.icon
                    size={14}
                    className={activeTab === tab.id ? "text-indigo-600" : ""}
                  />
                  {tab.label}
                </button>
              )
          )}
        </div>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-10 bg-slate-50 dark:bg-slate-950"
          ref={scrollRef}
        >
          {/* ── TAB: DASHBOARD ─────────────────────────────────────────── */}
          {activeTab === "info" && (
            <div className="space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* KPI GRID */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {[
                  {
                    label: "Proyección",
                    value: `$${totalPossibleValue.toLocaleString("es-CO")}`,
                    icon: DollarSign,
                    color: "indigo",
                  },
                  {
                    label: "Recaudado",
                    value: `$${balance?.totalPaid?.toLocaleString("es-CO") || 0}`,
                    icon: CheckCircle2,
                    color: "emerald",
                  },
                  {
                    label: "Pendiente",
                    value: `$${balance?.balance?.toLocaleString("es-CO") || 0}`,
                    icon: Clock,
                    color: "amber",
                  },
                  {
                    label: "Cierre",
                    value: `${balance?.compliancePercentage?.toFixed(0) || 0}%`,
                    icon: TrendingUp,
                    color: "violet",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white dark:border-slate-800 shadow-sm group"
                  >
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 bg-${stat.color}-500/10 text-${stat.color}-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <stat.icon size={16} className="sm:w-5 sm:h-5" />
                    </div>
                    <p className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter truncate">
                      {stat.value}
                    </p>
                    <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* ✅ Tarjetas por método de pago (funcionalidad del viejo) */}
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-l-4 border-emerald-500 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                    <Banknote size={18} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Total Efectivo
                    </p>
                    <p className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tighter">
                      ${totalCASH.toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-l-4 border-blue-500 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Total Transferencia
                    </p>
                    <p className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tighter">
                      ${totalBANK.toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>
              </div>

              {/* INFO + PRICE + STATS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="col-span-1 lg:col-span-2 space-y-6 sm:space-y-8">
                  {/* Cronograma */}
                  <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white dark:border-slate-800 space-y-6">
                    <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                      <Info size={14} className="text-indigo-500" />
                      Cronograma y Capacidad
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
                      {[
                        {
                          label: "Ingreso Agenda",
                          value: formatLocalDate(activity.registrationDate),
                          icon: Calendar,
                        },
                        {
                          label: "Término Agenda",
                          value: formatLocalDate(activity.endDate),
                          icon: Clock,
                          extra:
                            daysLeft > 0 ? `${daysLeft} días` : daysLeft === 0 ? "HOY" : null,
                        },
                        {
                          label: "Nivel Requerido",
                          value:
                            activity.requiredLevel?.displayName ||
                            activity.requiredLevel?.code ||
                            "Libre",
                          icon: Tag,
                          color: "violet",
                        },
                        {
                          label: "Cupos / Meta",
                          value: activity.quantity
                            ? `${enrolledCount} / ${activity.quantity}`
                            : "ILIMITADO",
                          icon: Users,
                          color: "emerald",
                        },
                      ].map((it) => (
                        <div key={it.label} className="space-y-1 sm:space-y-2">
                          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <it.icon
                              size={12}
                              className={
                                it.color
                                  ? `text-${it.color}-500`
                                  : "text-indigo-400"
                              }
                            />
                            {it.label}
                          </p>
                          <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {it.value}
                            {it.extra && (
                              <span className="ml-2 text-[8px] bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 rounded-md">
                                {it.extra}
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats de entrega */}
                  <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white dark:border-slate-800 overflow-hidden">
                    <ActivityDeliveryStats
                      participants={participants}
                      activityName={activity.activityName}
                    />
                  </div>
                </div>

                {/* Precio + PDF */}
                <div className="space-y-6">
                  <div className="bg-indigo-600 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/5 rounded-bl-full group-hover:bg-white/10 transition-all duration-700" />
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-3 sm:mb-4">
                      Inversión Individual
                    </p>
                    <h4 className="text-3xl sm:text-4xl font-black tracking-tighter mb-1">
                      ${Math.round(activity.price || 0).toLocaleString("es-CO")}
                    </h4>
                    <p className="text-[9px] sm:text-[10px] font-bold text-white/60 uppercase tracking-widest">
                      Valor unitario COP
                    </p>
                    <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
                      <button
                        onClick={handlePrintPDF}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 shadow-2xl"
                      >
                        <Download size={16} /> Imprimir Comprobante
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: INSCRIBIR ─────────────────────────────────────────── */}
          {activeTab === "enroll" && !readOnly && (
            <div className="space-y-8 sm:space-y-10 animate-in slide-in-from-right-4 duration-500 max-w-2xl mx-auto">
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 sm:space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Vincular Nuevo Miembro
                  </h3>
                  {/* ✅ FIX #1: eligibleMembers.length ahora correcto */}
                  <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Info size={14} className="text-indigo-500" />
                    {loadingMembers
                      ? "Cargando..."
                      : `${eligibleMembers.length} elegibles · ${enrolledCount} inscritos`}
                  </p>
                  {!hasCapacity && activity.quantity && (
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                      ⚠️ Capacidad máxima alcanzada ({activity.quantity})
                    </p>
                  )}
                </div>

                {enrollSuccess && (
                  <div className="p-5 sm:p-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl sm:rounded-[1.8rem] text-emerald-600 text-center animate-in zoom-in-95 duration-500">
                    <CheckCircle2 size={24} className="mx-auto mb-3" />
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest">
                      {enrollSuccess}
                    </p>
                  </div>
                )}

                {hasCapacity && (
                  <div className="space-y-5 sm:space-y-6">
                    {/* Buscador de miembro */}
                    <div
                      className="space-y-2 relative group"
                      ref={dropdownRef}
                    >
                      <label className="flex gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 sm:ml-5">
                        <Search
                          size={18}
                          className="text-slate-300 group-focus-within:text-indigo-600 transition-colors"
                        />Localizador de Miembro *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Nombre o documento..."
                          value={selectedMember ? selectedMember.name : searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setSelectedMember(null);
                            setShowDropdown(true);
                          }}
                          onFocus={() => setShowDropdown(true)}
                          disabled={enrolling}
                          className="w-full pl-12 sm:pl-16 pr-12 sm:pr-14 py-4 sm:py-5 bg-slate-50 dark:bg-slate-950/50 border-2 border-transparent focus:border-indigo-600/30 rounded-xl sm:rounded-[1.8rem] text-sm font-black outline-none transition-all disabled:opacity-50"
                        />
                        {selectedMember && (
                          <button
                            onClick={() => {
                              setSelectedMember(null);
                              setSearchTerm("");
                            }}
                            className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg hover:text-rose-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      {showDropdown &&
                        filteredDropdown.length > 0 &&
                        !selectedMember && (
                          <div className="absolute z-20 top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                            {filteredDropdown.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => {
                                  setSelectedMember(m);
                                  setShowDropdown(false);
                                }}
                                className="w-full px-6 sm:px-8 py-4 sm:py-5 text-left border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex justify-between items-center group/item"
                              >
                                <div>
                                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover/item:text-indigo-600 transition-colors">
                                    {m.name}
                                  </p>
                                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                                    {m.document}
                                  </p>
                                </div>
                                <div className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 text-[8px] font-black rounded-lg shrink-0">
                                  {m.currentLevel?.displayName || "NIVEL 0"}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      {showDropdown &&
                        searchTerm.trim() !== "" &&
                        filteredDropdown.length === 0 &&
                        !selectedMember && (
                          <div className="absolute z-20 top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl p-6 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Sin elegibles con "{searchTerm}"
                            </p>
                          </div>
                        )}
                    </div>

                    {/* ✅ FIX #4: Cantidad SOLO para STANDALONE */}
                    {isStandalone && (
                      <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 sm:ml-5">
                            📦 Unidades *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) =>
                              setQuantity(
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            disabled={enrolling}
                            className="w-full px-6 sm:px-8 py-4 sm:py-5 bg-slate-50 dark:bg-slate-950/50 border-none rounded-xl sm:rounded-[1.8rem] text-sm font-black outline-none"
                          />
                        </div>
                        <div className="space-y-2 text-center">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                            Inversión Final
                          </label>
                          <div className="w-full py-4 sm:py-5 bg-indigo-50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 text-sm font-black rounded-xl sm:rounded-[1.8rem] border-2 border-indigo-100 dark:border-indigo-500/20 truncate">
                            ${totalPriceForQuantity.toLocaleString("es-CO")}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pago inicial toggle */}
                    <div className="pt-2 sm:pt-4 border-t border-slate-50 dark:border-slate-800">
                      <button
                        onClick={() =>
                          setShowPaymentSection(!showPaymentSection)
                        }
                        disabled={enrolling || !selectedMember}
                        className={`w-full py-4 px-6 sm:px-8 flex justify-between items-center rounded-xl sm:rounded-2xl transition-all disabled:opacity-50 ${
                          showPaymentSection
                            ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                          <CreditCard size={18} /> Registro de Pago Inicial
                        </span>
                        <ChevronDown
                          size={18}
                          className={`transition-transform ${showPaymentSection ? "rotate-180" : ""}`}
                        />
                      </button>

                      {showPaymentSection && (
                        <div className="mt-4 sm:mt-6 space-y-5 sm:space-y-6 animate-in slide-in-from-top-4 duration-500 p-6 sm:p-8 bg-slate-50 dark:bg-slate-950/40 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 sm:ml-5">
                              Monto del Abono *
                            </label>
                            <input
                              type="number"
                              placeholder="Ej: 50000"
                              value={initialPayment}
                              onChange={(e) =>
                                setInitialPayment(e.target.value)
                              }
                              disabled={enrolling}
                              min="1"
                              max={totalPriceForQuantity}
                              className="w-full px-6 sm:px-8 py-4 bg-white dark:bg-slate-900 border-none rounded-xl sm:rounded-[1.5rem] text-sm font-black outline-none shadow-sm"
                            />
                            <p className="text-[9px] text-slate-400 ml-4">
                              Máximo: $
                              {totalPriceForQuantity.toLocaleString("es-CO")}
                              {isStandalone && quantity > 1
                                ? ` (${quantity} × $${(activity.price || 0).toLocaleString("es-CO")})`
                                : ""}
                            </p>
                          </div>

                          {/* Resumen de pago */}
                          {initialPayment && parseFloat(initialPayment) > 0 && (
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Total</span>
                                <span className="text-slate-700 dark:text-slate-300">
                                  ${totalPriceForQuantity.toLocaleString("es-CO")}
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Abono</span>
                                <span className="text-emerald-600">
                                  $
                                  {parseFloat(initialPayment).toLocaleString(
                                    "es-CO"
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest border-t border-slate-100 dark:border-slate-800 pt-2">
                                <span className="text-slate-400">Saldo</span>
                                <span className="text-amber-500">
                                  $
                                  {(
                                    totalPriceForQuantity -
                                    parseFloat(initialPayment)
                                  ).toLocaleString("es-CO")}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 sm:ml-5">
                              Canal de Ingreso *
                            </label>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              {["CASH", "BANK_TRANSFER"].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setIncomeMethod(m)}
                                  className={`py-3 sm:py-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
                                    incomeMethod === m
                                      ? "bg-indigo-600 text-white shadow-lg"
                                      : "bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800"
                                  }`}
                                >
                                  {m === "CASH" ? "💵 Efectivo" : "🏦 Transf."}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {enrollError && (
                      <p className="text-[9px] sm:text-[10px] font-black text-rose-500 uppercase tracking-widest text-center animate-in leading-tight">
                        ⚠️ {enrollError}
                      </p>
                    )}

                    {/* ✅ FIX #5: Botón deshabilitado si el estado no es válido */}
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling || !selectedMember || !canEnroll}
                      className="w-full py-5 sm:py-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-[1.5rem] sm:rounded-[2rem] font-black text-[11px] sm:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      {enrolling ? (
                        <RefreshCw size={20} className="animate-spin" />
                      ) : (
                        <>
                          {showPaymentSection &&
                          initialPayment &&
                          parseFloat(initialPayment) > 0
                            ? `Inscribir con $${parseFloat(initialPayment).toLocaleString("es-CO")}`
                            : `Vincular Participante`}
                          {isStandalone && quantity > 1
                            ? ` (×${quantity})`
                            : ""}
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                    {!canEnroll && (
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                        La actividad debe estar activa para inscribir miembros
                      </p>
                    )}
                  </div>
                )}

                {!hasCapacity && activity.quantity && (
                  <div className="p-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-center">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                      ⚠️ Capacidad máxima alcanzada ({activity.quantity} cupos)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: EGRESOS ───────────────────────────────────────────── */}
          {activeTab === "costs" && !readOnly && (
            <div className="space-y-8 sm:space-y-10 animate-in slide-in-from-right-4 duration-500">
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 sm:mb-10">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">
                      Egresos Operativos
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Auditoría de Inversión Ministerial
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-3xl sm:text-4xl font-black text-rose-500 tracking-tighter leading-none">
                      ${totalCosts.toLocaleString("es-CO")}
                    </p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                      Gasto Total Acumulado
                    </p>
                  </div>
                </div>

                {/* Formulario nuevo egreso */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 items-end bg-slate-50 dark:bg-slate-950 p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-50 dark:border-slate-800">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                      Detalle / Concepto *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Publicidad o Alquiler"
                      value={costForm.detail}
                      onChange={(e) =>
                        setCostForm({ ...costForm, detail: e.target.value })
                      }
                      disabled={savingCost}
                      className="w-full px-5 py-4 bg-white dark:bg-slate-900 border-none rounded-xl sm:rounded-2xl text-xs font-black outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                      Valor *
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={costForm.price}
                      onChange={(e) =>
                        setCostForm({ ...costForm, price: e.target.value })
                      }
                      disabled={savingCost}
                      className="w-full px-5 py-4 bg-white dark:bg-slate-900 border-none rounded-xl sm:rounded-2xl text-xs font-black outline-none disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={handleSaveCost}
                    disabled={savingCost}
                    className="h-12 sm:h-14 bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                  >
                    {savingCost ? (
                      <RefreshCw size={16} className="animate-spin mx-auto" />
                    ) : (
                      "Registrar"
                    )}
                  </button>
                </div>

                {/* Tabla de egresos */}
                <div className="mt-8 overflow-x-auto no-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-[2rem]">
                  {loadingCosts ? (
                    <div className="py-16 text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                      Cargando registros...
                    </div>
                  ) : (
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/50">
                          {["Fecha", "Concepto", "Monto", "Método", "Por", "Acción"].map(
                            (h) => (
                              <th
                                key={h}
                                className="px-6 py-4 text-left text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-widest"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {costs.length === 0 ? (
                          <tr>
                            <td
                              colSpan="6"
                              className="py-16 text-center text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]"
                            >
                              Sin reportes de egreso
                            </td>
                          </tr>
                        ) : (
                          costs.map((c) => (
                            <tr
                              key={c.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group"
                            >
                              <td className="px-6 py-4 text-xs font-bold text-slate-400">
                                {new Date(c.fecha).toLocaleDateString("es-CO")}
                              </td>
                              <td className="px-6 py-4 text-[11px] sm:text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                                {c.detail}
                              </td>
                              <td className="px-6 py-4 text-[11px] sm:text-sm font-black text-indigo-600">
                                ${c.price?.toLocaleString("es-CO")}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                    c.incomeMethod === "CASH"
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : "bg-blue-500/10 text-blue-600"
                                  }`}
                                >
                                  {c.incomeMethod === "CASH"
                                    ? "Efectivo"
                                    : "Transf."}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-[10px] font-bold text-slate-400">
                                {c.recordedBy}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleDeleteCost(c.id)}
                                  className="p-2 sm:p-3 bg-white dark:bg-slate-800 text-slate-300 hover:text-rose-500 rounded-lg transition-all shadow-sm opacity-60 sm:opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div className="p-6 sm:p-10 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-4 shrink-0">
          <span className="text-[8px] sm:text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">
            Gestión Centralizada · Elite UI
          </span>
          <div className="flex w-full sm:w-auto gap-3">
            <button
              onClick={handlePrintPDF}
              className="flex-1 sm:flex-none px-4 sm:px-8 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:border-indigo-600 transition-all flex items-center justify-center gap-2 sm:gap-3 shadow-sm active:scale-95"
            >
              <Download size={14} className="text-indigo-500" />
              <span className="hidden xs:inline">Reporte</span> PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 sm:px-10 py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-xl transition-all hover:bg-black active:scale-95"
            >
              Finalizar
            </button>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .animate-in { animation: fadeSlideIn 0.4s ease-out; }
          @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `,
        }}
      />
    </div>
  );
};

export default ModalActivityDetails;