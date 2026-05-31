import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle, RefreshCw, Send } from "lucide-react";
import { useEligibleResolversQuery } from "../hooks/queries/useEligibleResolversQuery";
import { useReassignTicketMutation } from "../hooks/mutations/useReassignTicketMutation";

export const ReassignTicketModal = ({ isOpen, onClose, ticketId, onSuccess }) => {
  const [assignedToId, setAssignedToId] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");

  const {
    data: eligibleResolvers = [],
    isLoading: isLoadingResolvers,
    isError: isErrorResolvers,
    refetch
  } = useEligibleResolversQuery(ticketId, {
    enabled: isOpen && !!ticketId,
  });

  const reassignMutation = useReassignTicketMutation({
    onSuccess: (data) => {
      setAssignedToId("");
      setDetails("");
      setError("");
      if (onSuccess) onSuccess(data);
      onClose();
    },
    onError: (err) => {
      setError(err.message || "Error al reasignar el ticket. Intenta nuevamente.");
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setAssignedToId("");
      setDetails("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!assignedToId) {
      setError("Debes seleccionar un responsable para la reasignación.");
      return;
    }

    reassignMutation.mutate({
      id: ticketId,
      reassignData: {
        assignedToId: parseInt(assignedToId),
        details: details.trim() || "Reasignación de responsable."
      }
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* BACKDROP */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* MODAL CONTAINER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/5 flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* HEADER */}
          <div className="h-20 border-b border-slate-100 dark:border-white/5 flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <RefreshCw size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Reasignar Ticket
                </h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                  Delegar Caso
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* FORM BODY */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-800/30 text-sm font-semibold">
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </div>
            )}

            {/* SELECCIONAR NUEVO RESPONSABLE */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Selecciona Nuevo Responsable <span className="text-rose-500">*</span>
              </label>

              {isLoadingResolvers ? (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 py-3">
                  <Loader2 size={14} className="animate-spin" /> Cargando operadores disponibles...
                </div>
              ) : isErrorResolvers ? (
                <div className="flex flex-col gap-2 text-xs font-bold text-rose-500 py-2">
                  <span>Ocurrió un error al cargar los operadores elegibles.</span>
                  <button
                    type="button"
                    onClick={refetch}
                    className="w-fit px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 rounded-lg"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Selecciona un usuario...</option>
                  {eligibleResolvers.map((resolver) => (
                    <option key={resolver.id} value={resolver.id}>
                      {resolver.username} ({resolver.roles ? resolver.roles.join(", ") : "Sin rol"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* JUSTIFICACIÓN / DETALLES */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Detalles / Motivo del Cambio <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                required
                placeholder="Indica el motivo de la reasignación o instrucciones para el nuevo responsable..."
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
          </form>

          {/* FOOTER */}
          <div className="h-20 border-t border-slate-100 dark:border-white/5 flex items-center justify-end px-8 gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={reassignMutation.isPending}
              className="px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={reassignMutation.isPending || isLoadingResolvers}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white shadow-xl shadow-indigo-600/20 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {reassignMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Reasignar</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReassignTicketModal;
