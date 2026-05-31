import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Calendar, Tag, AlertCircle, UserCheck, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import useTicketCapabilities from "../hooks/useTicketCapabilities";
import { useAssignTicketMutation } from "../hooks/mutations/useAssignTicketMutation";
import { useConfirmation } from "../context/ConfirmationContext";

// Colores de badges de estado
const STATUS_COLORS = {
  ABIERTO: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/30",
  EN_PROCESO: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/30",
  RESUELTO: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30",
  CERRADO: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700/30",
  CANCELADO: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800/30",
};

// Colores de badges de prioridad
const PRIORITY_COLORS = {
  ALTA: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  MEDIA: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  BAJA: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

// Subcomponente de Fila para cumplir con las reglas de Hooks de React
const TicketRow = ({ ticket, index, handleRowClick, user }) => {
  const capabilities = useTicketCapabilities(ticket);
  const assignMutation = useAssignTicketMutation();
  const confirm = useConfirmation();

  const handleClaim = async (e) => {
    e.stopPropagation();
    if (!user?.id) return;

    const isConfirmed = await confirm({
      title: "¿Asignarte esta solicitud?",
      message: `Te registrarás como el encargado oficial de resolver "${ticket.title}". Se notificará al creador.`,
      type: "info",
      confirmLabel: "Tomar Caso",
    });

    if (!isConfirmed) return;

    assignMutation.mutate({
      id: ticket.id,
      assignData: {
        assignedToId: user.id,
        details: `Caso reclamado por el operador ${user.username || ''}`,
      },
    }, {
      onError: (err) => {
        console.error("❌ Error al reclamar el ticket:", err);
      },
    });
  };

  const statusColor = STATUS_COLORS[ticket.status] || "bg-slate-100 text-slate-700";
  const priorityColor = PRIORITY_COLORS[ticket.priority] || "bg-slate-100 text-slate-700";

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={() => handleRowClick(ticket.id)}
      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors group"
    >
      {/* ID */}
      <td className="px-6 py-4 text-sm font-black text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        #{ticket.id}
      </td>

      {/* Asunto/Título */}
      <td className="px-6 py-4 max-w-xs md:max-w-sm truncate">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {ticket.title}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1 mt-0.5">
            <Calendar size={12} />
            {new Date(ticket.createdAt).toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </td>

      {/* Categoría (Soporta configName del DTO de listado y config.name del DTO de detalle) */}
      <td className="px-6 py-4">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Tag size={14} className="text-slate-400" />
          {ticket.configName || ticket.config?.name || "Sin Categoría"}
        </span>
      </td>

      {/* Creador */}
      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
        <span className="font-semibold">{ticket.creatorName || "Usuario"}</span>
      </td>

      {/* Asignado o botón de Reclamar */}
      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
        {ticket.assignedToName ? (
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black uppercase shrink-0">
              {ticket.assignedToName.charAt(0)}
            </span>
            <span className="truncate max-w-[120px]">{ticket.assignedToName}</span>
          </span>
        ) : capabilities.canClaim ? (
          <button
            onClick={handleClaim}
            disabled={assignMutation.isPending}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-950/45 dark:hover:bg-indigo-600 dark:text-indigo-400 dark:hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 border border-indigo-200/50 dark:border-indigo-800/30 active:scale-95"
            title="Autoasignarse este requerimiento"
          >
            {assignMutation.isPending ? (
              <Loader2 size={12} className="animate-spin text-indigo-600" />
            ) : (
              <UserCheck size={12} />
            )}
            <span>Reclamar</span>
          </button>
        ) : (
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/30 px-2.5 py-1 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            Sin asignar
          </span>
        )}
      </td>

      {/* Prioridad */}
      <td className="px-6 py-4">
        <span className={`inline-flex items-center text-xs font-extrabold px-2.5 py-0.5 rounded-full ${priorityColor}`}>
          {ticket.priority}
        </span>
      </td>

      {/* Estado */}
      <td className="px-6 py-4">
        <span className={`inline-flex items-center text-xs font-extrabold px-3 py-1 rounded-full border ${statusColor}`}>
          {ticket.status.replace("_", " ")}
        </span>
      </td>

      {/* Acciones */}
      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => handleRowClick(ticket.id)}
          className="inline-flex items-center justify-center p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all"
          title="Ver detalle"
        >
          <Eye size={18} />
        </button>
      </td>
    </motion.tr>
  );
};

export const TicketsTable = ({ tickets = [] }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleRowClick = (id) => {
    navigate(`/dashboard/tickets/${id}`);
  };

  if (!tickets || tickets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm"
      >
        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 mb-4">
          <AlertCircle size={28} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          No hay solicitudes registradas
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Las solicitudes de soporte y requerimientos que crees o te sean asignadas aparecerán en esta sección.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 dark:bg-slate-800/20 border-b border-slate-100 dark:border-white/5">
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                ID
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Asunto
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Categoría
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Creado por
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Asignado a
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Prioridad
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Estado
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            <AnimatePresence initial={false}>
              {tickets.map((ticket, index) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  index={index}
                  handleRowClick={handleRowClick}
                  user={user}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TicketsTable;
