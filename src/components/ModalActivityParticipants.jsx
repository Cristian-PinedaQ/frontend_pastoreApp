// ModalActivityParticipants.jsx - CON FUNCIÓN DE GENERAR PDF (VERSIÓN OPTIMIZADA)
// ✅ INTEGRADO: nameHelper para transformación de nombres
// ✅ CORREGIDO: useCallback y useEffect sin warnings
// 🔐 AÑADIDO: prop readOnly para roles con solo GET
// 🗑️ AÑADIDO: eliminación de participante (solo en actividades "Por finalizar")

import React, { useState, useEffect, useCallback } from "react";
import { useConfirmation } from "../context/ConfirmationContext";
import ParticipantDetailModal from "./ParticipantDetailModal";
import apiService from "../apiService";
import { generateGeneralParticipantsPDF } from "../services/participantsGeneralPdfGenerator";
import {
  transformForDisplay,
  transformArrayForDisplay,
} from "../services/nameHelper";
import ItemDeliveryToggle from "./ItemDeliveryToggle";
import ActivityDeliveryStats from "./ActivityDeliveryStats";
import {
  X, Search, Trash2, Users, FileText,
  Filter, CheckCircle, AlertTriangle, Clock, RefreshCw, Lock, TrendingUp
} from "lucide-react";

const ModalActivityParticipants = ({
  isOpen,
  onClose,
  activity,
  onAddPayment,
  onEnrollParticipant,
  readOnly = false,
}) => {
  const confirm = useConfirmation();
  const [filterText, setFilterText] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leaderFilter, setLeaderFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [leaders, setLeaders] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // 🗑️ Estados para la eliminación de participantes
  const [participantToDelete, setParticipantToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // 🗑️ La actividad está "abierta" si isActive=true Y su fecha de fin no ha pasado
  // (equivale a los estados "Activa" y "Por finalizar" de ActivityPage)
  const isActivityOpen = (() => {
    if (!activity?.isActive) return false; // Inactiva → no
    if (!activity?.endDate) return true;
    const [y, m, d] = String(activity.endDate)
      .split("T")[0]
      .split("-")
      .map(Number);
    const end = new Date(y, m - 1, d); // fecha local sin UTC
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end >= today; // Finalizada → no; Activa/Por finalizar → sí
  })();

  // Puede eliminar si tiene permisos de escritura Y la actividad sigue abierta
  const canDeleteParticipants = !readOnly && isActivityOpen;

  // ✅ DEFINIR loadParticipants CON useCallback ANTES del useEffect
  const loadParticipants = useCallback(async () => {
    if (!activity?.id) return;

    setLoading(true);
    try {
      const url = `/activity-contribution/activity/${activity.id}/with-leader-info`;
      const response = await apiService.request(url, { method: "GET" });

      // ✅ USANDO nameHelper: Transformar nombres de participantes para mostrar
      const transformedParticipants = transformArrayForDisplay(response, [
        "memberName",
        "leaderName",
      ]);

      // ✅ Asegurarse de que itemDelivered está presente y es booleano
      const participantsWithDelivery = transformedParticipants.map((p) => ({
        ...p,
        itemDelivered: p.itemDelivered === true,
        delivered: p.itemDelivered === true,
        isDelivered: p.itemDelivered === true,
        item_delivered: p.itemDelivered === true,
        quantity: p.quantity || 1, // 📦 Asegurar quantity
      }));

      setParticipants(participantsWithDelivery);

      // Extraer líderes y distritos únicos para los filtros
      const uniqueLeaders = [...new Set(transformedParticipants.map(add => add.leaderName).filter(Boolean))];
      const uniqueDistricts = [...new Set(transformedParticipants.map(add => add.districtDescription).filter(Boolean))];
      setLeaders(uniqueLeaders);
      setDistricts(uniqueDistricts);
    } catch (error) {
      console.error("❌ Error cargando participantes:", error);
    } finally {
      setLoading(false);
    }
  }, [activity?.id]);

  // ✅ useEffect CON DEPENDENCIAS CORRECTAS
  useEffect(() => {
    if (isOpen && activity?.id) {
      loadParticipants();
    } else {
      setParticipants([]);
      setLeaders([]);
      setDistricts([]);
      setShowFilters(false);
    }
  }, [isOpen, activity?.id, loadParticipants]);

  // =====================================================
  // 🗑️ LÓGICA DE ELIMINACIÓN DE PARTICIPANTE
  // =====================================================

  /** Abre el modal de confirmación para eliminar */
  const handleDeleteClick = (e, participant) => {
    // Evitar que el click propague al handleParticipantClick de la fila
    e.stopPropagation();
    setDeleteError(null);
    setParticipantToDelete(participant);
  };

  /** Cancela la eliminación */
  const handleCancelDelete = () => {
    setParticipantToDelete(null);
    setDeleteError(null);
  };

  /**
   * Confirma y ejecuta la eliminación.
   */
  const handleConfirmDelete = async () => {
    if (!participantToDelete) return;

    const contributionId =
      participantToDelete.contributionId || participantToDelete.id;
    setDeleting(true);
    setDeleteError(null);

    try {
      await apiService.request(
        `/activity-contribution/delete/${contributionId}`,
        { method: "DELETE" },
      );

      // Quitar el participante de la lista local inmediatamente (optimistic update)
      setParticipants((prev) =>
        prev.filter((p) => (p.contributionId || p.id) !== contributionId),
      );

      setParticipantToDelete(null);
    } catch (error) {
      console.error("❌ Error eliminando participante:", error);
      // Mostrar mensaje de error dentro del modal de confirmación
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        "Error al eliminar. Verifica que los pagos asociados puedan eliminarse.";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // =====================================================

  const stats = {
    total: participants.length,
    fullyPaid: participants.filter((p) => p.isFullyPaid).length,
    partiallyPaid: participants.filter((p) => p.totalPaid > 0 && !p.isFullyPaid)
      .length,
    pending: participants.filter((p) => (p.totalPaid || 0) === 0).length,
    totalPaid: participants.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
    totalPending: participants.reduce(
      (sum, p) => sum + (p.pendingBalance || 0),
      0,
    ),
  };

  const filteredParticipants = participants.filter((participant) => {
    const searchTerm = filterText.toLowerCase();
    const matchesSearch =
      !filterText ||
      (participant.memberName &&
        participant.memberName.toLowerCase().includes(searchTerm)) ||
      (participant.memberEmail &&
        participant.memberEmail.toLowerCase().includes(searchTerm)) ||
      (participant.document &&
        participant.document.toLowerCase().includes(searchTerm)) ||
      (participant.leaderName &&
        participant.leaderName.toLowerCase().includes(searchTerm));

    const matchesLeader =
      !leaderFilter ||
      (participant.leaderName && participant.leaderName === leaderFilter);

    const matchesDistrict =
      !districtFilter ||
      (participant.districtDescription &&
        participant.districtDescription === districtFilter);

    return matchesSearch && matchesLeader && matchesDistrict;
  });

  const handleGeneratePDF = async () => {
    try {
      const unitPrice = activity?.price || 0;

      // Calcular estadísticas de unidades CORRECTAMENTE
      const totalUnits = participants.reduce(
        (sum, p) => sum + (p.quantity || 1),
        0,
      );
      const totalToPay = participants.reduce((sum, p) => {
        const qty = p.quantity || 1;
        const price = p.totalPrice || unitPrice * qty;
        return sum + price;
      }, 0);

      // Calcular entregas
      const deliveredCount = participants.filter(
        (p) => p.itemDelivered === true,
      ).length;
      const notDeliveredCount = participants.length - deliveredCount;

      // Calcular porcentaje de pago correcto usando totalToPay
      const percentagePaid =
        totalToPay > 0 ? ((stats.totalPaid / totalToPay) * 100).toFixed(1) : 0;

      // Calcular porcentaje de entrega
      const deliveryPercentage =
        participants.length > 0
          ? ((deliveredCount / participants.length) * 100).toFixed(1)
          : 0;

      // Asegurarse de que cada participante tenga todos los campos necesarios
      const participantsWithDelivery = filteredParticipants.map((p) => ({
        ...p,
        // Asegurar campos de entrega
        itemDelivered: p.itemDelivered === true,
        delivered: p.itemDelivered === true,
        isDelivered: p.itemDelivered === true,
        item_delivered: p.itemDelivered === true,
        // ✅ Asegurar campos de cantidad
        quantity: p.quantity || 1,
        totalPrice: p.totalPrice || unitPrice * (p.quantity || 1),
        // Asegurar campos de pago
        totalPaid: p.totalPaid || 0,
        pendingBalance: p.pendingBalance || 0,
        isFullyPaid: p.isFullyPaid || false,
        compliancePercentage: p.compliancePercentage || 0,
      }));

      const pdfData = {
        activity: {
          id: activity.id,
          name: activity.activityName,
          price: unitPrice,
          endDate: activity.endDate,
          quantity: activity.quantity,
          isActive: activity.isActive,
        },
        participants: participantsWithDelivery,
        filters: {
          searchText: filterText,
          leaderFilter,
          districtFilter,
        },
        statistics: {
          // Estadísticas básicas
          total: stats.total,
          fullyPaid: stats.fullyPaid,
          partiallyPaid: stats.partiallyPaid,
          pending: stats.pending,
          totalPaid: stats.totalPaid,
          totalPending: stats.totalPending,

          // ✅ NUEVAS: Estadísticas de unidades
          totalUnits: totalUnits,
          totalToPay: totalToPay,

          // Estadísticas de entregas
          delivered: deliveredCount,
          notDelivered: notDeliveredCount,

          // Porcentajes
          percentagePaid: percentagePaid,
          deliveryPercentage: deliveryPercentage,
        },
      };

      const filename = `participantes-general-${activity.activityName.toLowerCase().replace(/\s+/g, "-")}`;
      generateGeneralParticipantsPDF(pdfData, filename);
    } catch (error) {
      console.error("❌ Error generando PDF general:", error);
      await confirm({
        title: "Falla de Impresión",
        message: "Ocurrió un error inesperado al intentar generar el PDF de participantes. Por favor, reintente en unos momentos.",
        type: "error",
        confirmLabel: "Entendido"
      });
    }
  };

  const clearAllFilters = () => {
    setFilterText("");
    setLeaderFilter("");
    setDistrictFilter("");
  };

  const handleParticipantClick = async (participant) => {
    try {
      const contributionId = participant.contributionId || participant.id;
      const contribution = await apiService.request(
        `/activity-payment/contribution/${contributionId}`,
        { method: "GET" },
      );

      // ✅ USANDO nameHelper: Transformar nombres en la contribución
      const transformedContribution = transformForDisplay(contribution, [
        "memberName",
      ]);

      setContributions([transformedContribution]);
      setSelectedParticipant(participant);
      setShowDetailModal(true);
    } catch (error) {
      console.error("Error cargando contribuciones:", error);
      setContributions([participant]);
      setSelectedParticipant(participant);
      setShowDetailModal(true);
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedParticipant(null);
    setContributions([]);
  };

  const handlePaymentOrDeliverySuccess = useCallback(
    async (eventData) => {
      // Caso: cambio de entrega (optimistic update, NO recarga todo)
      if (eventData?.type === "deliveryChange") {
        setParticipants((prev) =>
          prev.map((p) => {
            const cid = p.id || p.contributionId;
            return cid === eventData.contributionId
              ? { ...p, itemDelivered: eventData.itemDelivered }
              : p;
          }),
        );
        return;
      }

      // ✅ Caso normal: pago → recargar desde backend
      await loadParticipants();
    },
    [loadParticipants],
  );

  const handleDeliveryChange = useCallback(
    (cid, val) => {
      handlePaymentOrDeliverySuccess({
        type: "deliveryChange",
        contributionId: cid,
        itemDelivered: val,
      });
    },
    [handlePaymentOrDeliverySuccess],
  );

  if (!isOpen || !activity) return null;

  const activeFiltersCount =
    (filterText ? 1 : 0) + (leaderFilter ? 1 : 0) + (districtFilter ? 1 : 0);

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
        <div 
          className="bg-slate-50 dark:bg-slate-950 w-full sm:max-w-7xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[3.5rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.5)] border-x-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER AREA (Fixed) */}
          <div className="p-6 sm:p-10 pb-4 sm:pb-6 relative overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
             <div className="absolute top-0 right-0 w-40 sm:w-80 h-40 sm:h-80 bg-indigo-500/5 rounded-full -mr-16 sm:-mr-32 -mt-16 sm:-mt-32 blur-2xl sm:blur-3xl"></div>
             
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 relative z-10 mb-6 sm:mb-8">
                <div className="flex items-center gap-4 sm:gap-6">
                   <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-900 dark:bg-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-500 shadow-2xl">
                      <Users size={24} className="sm:w-8 sm:h-8" />
                   </div>
                   <div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                         <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/20">
                            LISTADO DE PARTICIPANTES
                         </span>
                         <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stats.total} Vinculados</span>
                         {readOnly && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[8px] font-black border border-amber-500/20 uppercase tracking-widest flex items-center gap-1">
                               <Lock size={10} /> Lectura
                            </span>
                         )}
                      </div>
                      <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight uppercase truncate max-w-[250px] sm:max-w-none">{activity.activityName}</h2>
                   </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
                   <button
                     onClick={() => setShowFilters(!showFilters)}
                     className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
                       showFilters || activeFiltersCount > 0
                         ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                         : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-transparent'
                     }`}
                   >
                     <Filter size={14} /> <span className="hidden xs:inline">Filtros</span> {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                   </button>
                   
                   {filteredParticipants.length > 0 && (
                     <button
                       onClick={handleGeneratePDF}
                       className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-rose-500 text-white shadow-lg shadow-rose-500/20 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all"
                     >
                       <FileText size={14} /> <span className="hidden xs:inline">Exportar</span> PDF
                     </button>
                   )}
                   
                   <button onClick={onClose} className="p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg sm:rounded-2xl transition-all hover:rotate-90">
                      <X size={20} />
                   </button>
                </div>
             </div>

             {/* Búsqueda Principal (Fixed in Header) */}
             <div className="flex gap-2 sm:gap-3 relative z-10">
                <div className="relative flex-1">
                   <Search size={18} className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                   <input
                     type="text"
                     placeholder="Buscar por nombre, documento o líder..."
                     value={filterText}
                     onChange={(e) => setFilterText(e.target.value)}
                     className="w-full pl-12 sm:pl-16 pr-6 py-3 sm:py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-widest outline-none ring-2 ring-transparent focus:ring-indigo-600/20 transition-all shadow-inner"
                   />
                </div>
                <button
                  onClick={loadParticipants}
                  disabled={loading}
                  className="p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl sm:rounded-2xl text-slate-400 hover:text-indigo-600 transition-all active:scale-95 shadow-sm"
                >
                   <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
             </div>
          </div>


           <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-10 bg-slate-50 dark:bg-slate-950">
            
            {/* SECCIÓN DE FILTROS */}
            {showFilters && (
              <div className="mb-6 sm:mb-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Filter size={14} className="text-indigo-500" /> Segmentación Avanzada
                  </h4>
                  {(filterText || leaderFilter || districtFilter) && (
                    <button
                      onClick={clearAllFilters}
                      className="text-[9px] sm:text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Líder a Cargo</label>
                    <select
                      value={leaderFilter}
                      onChange={(e) => setLeaderFilter(e.target.value)}
                      className="w-full px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-none bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-600/20"
                    >
                      <option value="">TODOS LOS LÍDERES</option>
                      {leaders.map((leader, i) => (
                        <option key={i} value={leader}>{leader}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Distrito Eclesiástico</label>
                    <select
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                      className="w-full px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-none bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-600/20"
                    >
                      <option value="">TODOS LOS DISTRITOS</option>
                      {districts.map((district, i) => (
                        <option key={i} value={district}>{district}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ESTADÍSTICAS COMPACTAS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-10">
              {[
                { label: 'Totalmente Pago', value: stats.fullyPaid, icon: CheckCircle, color: 'emerald' },
                { label: 'Pago Parcial', value: stats.partiallyPaid, icon: AlertTriangle, color: 'amber' },
                { label: 'Pendiente', value: stats.pending, icon: Clock, color: 'rose' },
                { label: 'Deuda Total', value: `$${stats.totalPending.toLocaleString('es-CO')}`, icon: TrendingUp, color: 'indigo' }
              ].map(st => (
                <div key={st.label} className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white dark:border-slate-800 shadow-sm flex flex-col group">
                   <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-${st.color}-500/10 text-${st.color}-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <st.icon size={16} className="sm:w-5 sm:h-5" />
                   </div>
                   <p className="text-sm sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter truncate">{st.value}</p>
                   <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{st.label}</p>
                </div>
              ))}
            </div>

            <div className="mb-8 sm:mb-10 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white dark:border-slate-800 overflow-hidden">
               <ActivityDeliveryStats
                participants={participants}
                activityName={activity?.activityName}
              />
            </div>

            {/* LISTA DE PARTICIPANTES */}
            <div className="space-y-4">
               <h3 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex justify-between items-center">
                  Resultados del listado
                  <span className="text-indigo-600">{filteredParticipants.length} Miembros</span>
               </h3>

               {loading ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-70">
                  <RefreshCw size={40} className="text-indigo-500 animate-spin mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando expedientes...</p>
                </div>
              ) : filteredParticipants.length === 0 ? (
                <div className="py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8 border border-white dark:border-slate-800">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 dark:bg-black rounded-full flex items-center justify-center mb-6">
                     <Users size={32} className="text-slate-200" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                    No se encontraron registros
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                    {participants.length === 0 
                      ? "Aún no hay miembros vinculados a esta actividad." 
                      : "Ajusta los filtros de búsqueda para encontrar lo que necesitas."}
                  </p>
                </div>
              ) : (
                <>
                  {/* MOBILE VIEW (CARDS) */}
                  <div className="grid grid-cols-1 gap-4 sm:hidden">
                    {filteredParticipants.map(participant => (
                      <div 
                        key={participant.id || participant.contributionId}
                        onClick={() => handleParticipantClick(participant)}
                        className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-white dark:border-slate-800 shadow-sm relative overflow-hidden active:scale-[0.98] transition-all ${participant.itemDelivered ? 'ring-2 ring-emerald-500/20' : ''}`}
                      >
                         <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg">
                               {participant.memberName?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{participant.participantName || participant.memberName}</p>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{participant.leaderName || 'SIN LÍDER'}</p>
                            </div>
                            {canDeleteParticipants && (
                              <button onClick={(e) => handleDeleteClick(e, participant)} className="p-2 text-slate-300 hover:text-rose-500">
                                 <Trash2 size={16} />
                              </button>
                            )}
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-50 dark:border-slate-800">
                            <div>
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Inversión</p>
                               <p className="text-xs font-black text-indigo-600">${(participant.totalPaid || 0).toLocaleString('es-CO')}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Deuda</p>
                               <p className={`text-xs font-black ${participant.pendingBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                   ${(participant.pendingBalance || 0).toLocaleString('es-CO')}
                               </p>
                            </div>
                         </div>

                         <div className="flex items-center justify-between">
                            <div className="flex-1 mr-4">
                               <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-700 ${participant.isFullyPaid ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${Math.min(100, participant.compliancePercentage || 0)}%` }}
                                  />
                               </div>
                            </div>
                            <div onClick={e => e.stopPropagation()}>
                               <ItemDeliveryToggle
                                 contributionId={participant.id || participant.contributionId}
                                 initialDelivered={!!participant.itemDelivered}
                                 memberName={participant.memberName}
                                 onDeliveryChange={handleDeliveryChange}
                                 disabled={readOnly}
                                 compact
                               />
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP VIEW (TABLE) */}
                  <div className="hidden sm:block bg-white dark:bg-slate-900 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-slate-50 dark:bg-slate-950/50">
                               <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Participante</th>
                               <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Liderazgo</th>
                               <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Distrito</th>
                               <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                               <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Pendiente</th>
                               <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Inscrito</th>
                               <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Aportes</th>
                               <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Entrega</th>
                               {canDeleteParticipants && <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {filteredParticipants.map((participant) => (
                            <tr 
                              key={participant.id || participant.contributionId}
                              onClick={() => handleParticipantClick(participant)}
                              className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            >
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black text-sm uppercase">
                                       {participant.memberName?.charAt(0)}
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{participant.memberName}</p>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{participant.document}</p>
                                    </div>
                                 </div>
                              </td>
                               <td className="px-8 py-5">
                                  <p className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">{participant.leaderName || 'SIN LÍDER'}</p>
                               </td>
                               <td className="px-8 py-5">
                                  <p className="text-[9px] font-black text-slate-400 uppercase">{participant.districtDescription || 'N/A'}</p>
                               </td>
                               <td className="px-8 py-5 text-center">
                                  <div className="text-lg">
                                    {participant.enrollmentStatus === 'COMPLETED' ? '✅' : participant.enrollmentStatus === 'ACTIVE' ? '🟡' : '⏳'}
                                  </div>
                               </td>
                               <td className="px-8 py-5">
                                  <p className={`text-xs font-black ${participant.pendingBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                     ${(participant.pendingBalance || 0).toLocaleString('es-CO')}
                                  </p>
                               </td>
                               <td className="px-8 py-5">
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                     {participant.registrationDate ? new Date(participant.registrationDate).toLocaleDateString('es-CO') : '-'}
                                  </p>
                               </td>
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-4">
                                    <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                       <div 
                                         className={`h-full rounded-full transition-all duration-700 ${participant.isFullyPaid ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                         style={{ width: `${Math.min(100, participant.compliancePercentage || 0)}%` }}
                                       />
                                    </div>
                                     <p className={`text-xs font-black ${participant.isFullyPaid ? 'text-emerald-500' : 'text-indigo-600'}`}>
                                        ${(participant.totalPaid || 0).toLocaleString('es-CO')}
                                     </p>
                                 </div>
                              </td>
                              <td className="px-8 py-5" onClick={e => e.stopPropagation()}>
                                <ItemDeliveryToggle
                                  contributionId={participant.id || participant.contributionId}
                                  initialDelivered={!!participant.itemDelivered}
                                  memberName={participant.memberName}
                                  onDeliveryChange={handleDeliveryChange}
                                  disabled={readOnly}
                                  compact
                                />
                              </td>
                              {canDeleteParticipants && (
                                <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => handleDeleteClick(e, participant)}
                                    className="p-3 bg-white dark:bg-slate-800 text-slate-300 hover:text-rose-500 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100 active:scale-90"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
             </div>
           </div>


          {/* FOOTER GENERAL FIJO ESTILO APPLE */}
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 pointer-events-none flex justify-center z-20">
             <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-2 py-2 rounded-full border border-slate-200/50 dark:border-slate-800 shadow-2xl flex items-center justify-center gap-1.5 pointer-events-auto shrink-0 w-fit">
                <div className="hidden xs:flex px-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-full items-center gap-2 border border-slate-200/50 dark:border-slate-700/50">
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                   <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{filteredParticipants.length} Miembros</span>
                </div>
                <button
                  onClick={onClose}
                  className="px-8 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20 dark:shadow-white/10 flex items-center gap-2"
                >
                   <X size={16} /> Cerrar
                </button>
             </div>
          </div>
        </div>
      </div>

       {/* Modal de detalle */}
       {showDetailModal && selectedParticipant && (
        <ParticipantDetailModal
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
          participant={selectedParticipant}
          activity={activity}
          contribution={contributions[0]}
          onAddPaymentSuccess={handlePaymentOrDeliverySuccess}
          readOnly={readOnly}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {participantToDelete && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={handleCancelDelete}>
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 sm:p-10 shadow-[0_40px_100px_-15px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-rose-500/10">
               <Trash2 size={40} />
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4 leading-tight">Eliminar Participante</h3>

            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">
              ¿Estás seguro de que deseas desvincular a <span className="text-slate-900 dark:text-white font-black">{participantToDelete.memberName}</span> de esta actividad?
            </p>

            {(participantToDelete.totalPaid || 0) > 0 && (
              <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-left mb-8 shadow-inner">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest flex gap-3">
                  <AlertTriangle size={18} className="shrink-0" />
                   <span>Al eliminar a este miembro, desaparecerán sus aportes registrados de <span className="text-blue-600">${participantToDelete.totalPaid.toLocaleString()}</span> COP.</span>
                </p>
              </div>
            )}

            {deleteError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] font-black text-rose-500 uppercase tracking-widest mb-8">
                {deleteError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 h-14 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Permanecer
              </button>
              <button
                className="flex-1 h-14 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? <RefreshCw className="animate-spin" size={16} /> : "Sí, Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalActivityParticipants;
