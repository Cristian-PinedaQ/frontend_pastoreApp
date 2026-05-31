import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTicketDetailQuery } from "../hooks/queries/useTicketDetailQuery";
import useTicketCapabilities from "../hooks/useTicketCapabilities";
import { useAddCommentMutation } from "../hooks/mutations/useAddCommentMutation";
import { TicketActionsBar } from "../components/TicketActionsBar";
import { FieldRenderer } from "../components/FieldRenderer";
import { ReassignTicketModal } from "../components/ReassignTicketModal";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Tag, 
  Lock, 
  Send, 
  Loader2, 
  AlertCircle,
  MessageSquare,
  History as HistoryIcon,
  AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";

// Colores de badges de estado
const STATUS_BADGES = {
  ABIERTO: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/30",
  EN_PROCESO: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/30",
  RESUELTO: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30",
  CERRADO: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700/30",
  CANCELADO: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800/30",
};

const PRIORITY_BADGES = {
  ALTA: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  MEDIA: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  BAJA: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

export const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [commentText, setCommentText] = useState("");
  const [isPrivateComment, setIsPrivateComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

  // Query del detalle
  const { 
    data: ticket, 
    isLoading, 
    error,
    refetch
  } = useTicketDetailQuery(parseInt(id));

  // Adaptador de capacidades
  const capabilities = useTicketCapabilities(ticket);

  // Mutation para agregar comentarios
  const addCommentMutation = useAddCommentMutation({
    onSuccess: () => {
      setCommentText("");
      setIsPrivateComment(false);
      setCommentError("");
    },
    onError: (err) => {
      setCommentError(err.message || "Error al enviar el comentario.");
    }
  });

  const handleSubmitComment = (e) => {
    e.preventDefault();
    setCommentError("");

    if (!commentText.trim()) return;

    addCommentMutation.mutate({
      id: ticket.id,
      responseData: {
        message: commentText.trim(),
        isPrivate: isPrivateComment
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 min-h-[50vh]">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
          Cargando detalles de la solicitud...
        </p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl space-y-4">
        <AlertTriangle className="text-rose-500 mx-auto" size={48} />
        <h3 className="text-xl font-bold text-slate-950 dark:text-white">
          Error al cargar la solicitud
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {error?.message || "La solicitud no existe o no tienes los privilegios necesarios para visualizarla."}
        </p>
        <button
          onClick={() => navigate("/dashboard/tickets")}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm"
        >
          Volver a Solicitudes
        </button>
      </div>
    );
  }

  // Filtrar respuestas privadas si el usuario no tiene capacidades de ver notas privadas
  const visibleResponses = (ticket.responses || []).filter(res => {
    if (res.isPrivate) {
      return capabilities.canPrivateNote;
    }
    return true;
  });

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-10 lg:p-14 space-y-8 animate-in fade-in duration-500">
      
      {/* VOLVER ATRÁS */}
      <button
        onClick={() => navigate("/dashboard/tickets")}
        className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver a listado
      </button>

      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Solicitud #{ticket.id}
            </span>
            <span className={`inline-flex items-center text-xs font-extrabold px-3 py-0.5 rounded-full border ${STATUS_BADGES[ticket.status] || "bg-slate-100"}`}>
              {ticket.status.replace("_", " ")}
            </span>
            <span className={`inline-flex items-center text-xs font-extrabold px-2.5 py-0.5 rounded-full ${PRIORITY_BADGES[ticket.priority] || "bg-slate-100"}`}>
              Prioridad {ticket.priority}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {ticket.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1.5 mt-2 font-semibold">
            <Calendar size={14} />
            Creado el {new Date(ticket.createdAt).toLocaleString("es-CO")} por <span className="text-slate-700 dark:text-slate-300 font-bold">{ticket.creatorName}</span>
          </p>
        </div>

        {/* CATEGORÍA EN BADGE GIGANTE */}
        <div className="bg-slate-100 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/80 px-4 py-3 rounded-2xl flex items-center gap-2 self-start md:self-auto">
          <Tag size={16} className="text-indigo-500" />
          <div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider leading-none">Categoría</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{ticket.config?.name || "Sin Categoría"}</p>
          </div>
        </div>
      </div>

      {/* CUERPO DEL DETALLE: DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUMNA PRINCIPAL (IZQUIERDA - 65%) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* DESCRIPCIÓN DEL CASO */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/60 dark:border-white/5 p-8 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">
              Detalle del Requerimiento
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          {/* METADATOS DINÁMICOS */}
          {ticket.metadata && Object.keys(ticket.metadata).length > 0 && (
            <FieldRenderer mode="read" values={ticket.metadata} />
          )}

          {/* SECCIÓN DE COMENTARIOS */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <MessageSquare size={18} className="text-indigo-500" />
              <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">
                Hilo de Respuestas ({visibleResponses.length})
              </h3>
            </div>

            {/* LISTADO DE COMENTARIOS */}
            <div className="space-y-4">
              {visibleResponses.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    No hay comentarios en esta solicitud
                  </p>
                </div>
              ) : (
                visibleResponses.map((res, index) => {
                  return (
                    <motion.div
                      key={res.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 rounded-[1.8rem] border shadow-sm transition-all ${
                        res.isPrivate
                          ? "bg-rose-50/40 dark:bg-rose-950/5 border-rose-200/50 dark:border-rose-900/30"
                          : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                            {res.authorName ? res.authorName.charAt(0) : "U"}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white block">
                              {res.authorName}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                              {new Date(res.createdAt).toLocaleString("es-CO")}
                            </span>
                          </div>
                        </div>

                        {res.isPrivate && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400 rounded-md">
                            <Lock size={10} /> Nota Privada
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">
                        {res.message}
                      </p>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* CAJA DE NUEVO COMENTARIO */}
            {capabilities.canComment ? (
              <form onSubmit={handleSubmitComment} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/60 dark:border-white/5 p-6 shadow-sm space-y-4">
                {commentError && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-800/30 text-xs font-semibold">
                    <AlertCircle size={16} />
                    {commentError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Escribir Respuesta
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={4}
                    placeholder="Digita tu respuesta o actualización sobre esta solicitud..."
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* PRIVACIDAD */}
                  {capabilities.canPrivateNote ? (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isPrivateComment}
                        onChange={(e) => setIsPrivateComment(e.target.checked)}
                        className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 dark:bg-slate-800 dark:border-slate-700"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Lock size={12} className="text-rose-500" /> Marcar como Nota Privada (Solo pastores/operadores)
                      </span>
                    </label>
                  ) : (
                    <div />
                  )}

                  <button
                    type="submit"
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 disabled:scale-100 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/10"
                  >
                    {addCommentMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>Enviar</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Esta solicitud está en estado terminal ({ticket.status.replace("_", " ")}). No se permiten más respuestas.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA LATERAL (DERECHA - 35%) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* ACCIONES */}
          <TicketActionsBar ticket={ticket} capabilities={capabilities} user={user} onReassignClick={() => setIsReassignModalOpen(true)} />

          {/* TARJETA DE INFORMACIÓN / GESTIÓN */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/60 dark:border-white/5 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-white/5">
              Estado de la Solicitud
            </h3>
            
            <div className="space-y-4">
              {/* ASIGNADO A */}
              <div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                  Responsable Asignado
                </span>
                {ticket.assignedToName ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black uppercase">
                      {ticket.assignedToName.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {ticket.assignedToName}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-400 italic">
                    Sin asignar actualmente
                  </span>
                )}
              </div>

              {/* CREADO POR */}
              <div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                  Reportado Por
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">
                    <User size={14} />
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {ticket.creatorName}
                  </span>
                </div>
              </div>

              {/* CONFIGURACIÓN RESOLUTOR COLA */}
              {ticket.config?.resolverRoles && ticket.config.resolverRoles.length > 0 && (
                <div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">
                    Roles Resolutores Habilitados
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.config.resolverRoles.map((roleObj, i) => {
                      const roleName = (typeof roleObj === "object" ? roleObj.name : roleObj) || "";
                      const cleanName = roleName.replace("ROLE_", "");
                      return (
                        <span key={i} className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">
                          {cleanName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* HISTORIAL / AUDITORÍA (TIMELINE) */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/60 dark:border-white/5 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
              <HistoryIcon size={16} className="text-indigo-500" />
              <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">
                Línea de Tiempo
              </h3>
            </div>

            <div className="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-6">
              {(!ticket.history || ticket.history.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No hay registros de auditoría.</p>
              ) : (
                ticket.history.map((hist, index) => {
                  return (
                    <div key={hist.id || index} className="relative">
                      {/* Círculo indicador */}
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-4 ring-white dark:ring-slate-900" />
                      
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          {new Date(hist.createdAt).toLocaleString("es-CO", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {String(hist.actionType).replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-tight">
                          {hist.actionDetails} — <span className="font-semibold text-slate-600 dark:text-slate-400">{hist.userName}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
      
      <ReassignTicketModal 
        isOpen={isReassignModalOpen} 
        onClose={() => setIsReassignModalOpen(false)} 
        ticketId={ticket.id} 
        onSuccess={refetch} 
      />
    </div>
  );
};

export default TicketDetailPage;
