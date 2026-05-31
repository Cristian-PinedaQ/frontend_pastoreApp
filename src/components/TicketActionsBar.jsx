import React, { useState } from "react";
import { motion } from "framer-motion";
import { UserCheck, CheckCircle2, XCircle, ArrowRight, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useAssignTicketMutation } from "../hooks/mutations/useAssignTicketMutation";
import { useUpdateStatusMutation } from "../hooks/mutations/useUpdateStatusMutation";
import { useConfirmation } from "../context/ConfirmationContext";

// Mapa de estilos y colores por tipo de transición / acción
const ACTION_STYLES = {
  CLAIM: {
    bg: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20",
    icon: UserCheck,
    label: "Tomar Caso",
  },
  REASSIGN: {
    bg: "bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 shadow-sm border border-indigo-200 dark:border-indigo-800/30",
    icon: RefreshCw,
    label: "Reasignar Caso",
  },
  EN_PROCESO: {
    bg: "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20",
    icon: ArrowRight,
  },
  RESUELTO: {
    bg: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20",
    icon: CheckCircle2,
  },
  CERRADO: {
    bg: "bg-slate-700 hover:bg-slate-800 text-white shadow-lg shadow-slate-700/20",
    icon: CheckCircle2,
  },
  CANCELADO: {
    bg: "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20",
    icon: XCircle,
  },
};

export const TicketActionsBar = ({ ticket, capabilities, user, onReassignClick }) => {
  const confirm = useConfirmation();
  const [activeAction, setActiveAction] = useState(null); // 'claim' o 'transition_[status]'
  const [errorMessage, setErrorMessage] = useState(null);

  const assignMutation = useAssignTicketMutation({
    onMutate: () => {
      setActiveAction("claim");
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error.message || "Error al autoasignarse el ticket.");
    },
    onSettled: () => {
      setActiveAction(null);
    },
  });

  const statusMutation = useUpdateStatusMutation({
    onMutate: ({ statusData }) => {
      setActiveAction(`transition_${statusData.status}`);
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error.message || "Error al cambiar el estado del ticket.");
    },
    onSettled: () => {
      setActiveAction(null);
    },
  });

  // Reclamar/Autoasignarse
  const handleClaim = async () => {
    if (!user?.id) return;
    
    const isConfirmed = await confirm({
      title: "¿Asignarte esta solicitud?",
      message: "Te registrarás como el encargado oficial de resolver este ticket. Se notificará al creador.",
      type: "info",
      confirmLabel: "Tomar Caso",
    });

    if (isConfirmed) {
      assignMutation.mutate({
        id: ticket.id,
        assignData: { 
          assignedToId: user.id,
          details: `Caso reclamado por el operador ${user.username || ''}`
        },
      });
    }
  };

  // Realizar transición de estado
  const handleTransition = async (toStatus, label) => {
    let confirmType = "info";
    if (toStatus === "CANCELADO") confirmType = "warning";
    if (toStatus === "RESUELTO") confirmType = "success";

    const isConfirmed = await confirm({
      title: `¿Confirmar: ${label}?`,
      message: `¿Estás seguro de cambiar el estado de la solicitud a "${label.toUpperCase()}"?`,
      type: confirmType,
      confirmLabel: label,
    });

    if (isConfirmed) {
      statusMutation.mutate({
        id: ticket.id,
        statusData: { 
          status: toStatus,
          details: `Cambio de estado a ${label} por el operador ${user?.username || ''}`
        },
      });
    }
  };

  const hasActions = capabilities.canClaim || capabilities.canReassign || (capabilities.allowedTransitions && capabilities.allowedTransitions.length > 0);

  if (!hasActions && !errorMessage) return null;

  return (
    <div className="flex flex-col gap-3">
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-800/30 text-xs font-semibold"
        >
          <AlertCircle size={16} />
          {errorMessage}
        </motion.div>
      )}

      {hasActions && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-white/5">
          <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2">
            Acciones Disponibles
          </span>

          <div className="flex flex-wrap items-center gap-3">
            {/* BOTÓN RECLAMAR / AUTOASIGNAR */}
            {capabilities.canClaim && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClaim}
                disabled={activeAction !== null}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed ${ACTION_STYLES.CLAIM.bg}`}
              >
                {activeAction === "claim" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UserCheck size={16} />
                )}
                <span>Tomar Caso</span>
              </motion.button>
            )}

            {/* BOTÓN REASIGNAR CASO */}
            {capabilities.canReassign && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onReassignClick}
                disabled={activeAction !== null}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed ${ACTION_STYLES.REASSIGN.bg}`}
              >
                <RefreshCw size={16} />
                <span>Reasignar Caso</span>
              </motion.button>
            )}

            {/* BOTONES DE TRANSICIONES */}
            {capabilities.allowedTransitions &&
              capabilities.allowedTransitions.map((trans) => {
                const style = ACTION_STYLES[trans.to] || ACTION_STYLES.EN_PROCESO;
                const Icon = style.icon;
                const isProcessing = activeAction === `transition_${trans.to}`;

                return (
                  <motion.button
                    key={trans.to}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTransition(trans.to, trans.label)}
                    disabled={activeAction !== null}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-all disabled:opacity-50 disabled:cursor-not-allowed ${style.bg}`}
                  >
                    {isProcessing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Icon size={16} />
                    )}
                    <span>{trans.label}</span>
                  </motion.button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketActionsBar;
