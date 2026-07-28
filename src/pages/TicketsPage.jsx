import React, { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import PageHero from "../components/PageHero";
import TicketsTable from "../components/TicketsTable";
import CreateTicketModal from "../components/CreateTicketModal";
import useTicketsQuery from "../hooks/queries/useTicketsQuery";
import useTicketStatsQuery from "../hooks/queries/useTicketStatsQuery";
import { TicketFilter } from "../services/ticketApi";
import { 
  Ticket as TicketIcon, 
  Inbox, 
  UserCheck, 
  HelpCircle, 
  Plus, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";

const tabToFilterMap = {
  reported: TicketFilter.REPORTED,
  assigned: TicketFilter.ASSIGNED,
  queue: TicketFilter.QUEUE
};

export const TicketsPage = () => {
  const { user, hasRole } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTab, setActiveTab] = useState("reported"); // 'reported', 'assigned', 'queue'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filter = tabToFilterMap[activeTab] || TicketFilter.REPORTED;

  // Obtener tickets desde React Query con paginación y filtro de pestaña en el servidor
  const { 
    data: ticketsData, 
    isLoading: isLoadingTickets, 
    isFetching: isFetchingTickets, 
    refetch: refetchTickets 
  } = useTicketsQuery(filter, currentPage, 10);

  // Obtener estadísticas globales de tickets para los contadores de las pestañas
  const {
    data: statsData,
    isLoading: isLoadingStats,
    isFetching: isFetchingStats,
    refetch: refetchStats
  } = useTicketStatsQuery();

  const allTickets = useMemo(() => {
    return ticketsData?.content || [];
  }, [ticketsData]);

  const totalPages = ticketsData?.totalPages || 0;
  const totalElements = ticketsData?.totalElements || 0;

  // El backend ya devuelve el listado filtrado por pestaña
  const filteredTickets = useMemo(() => {
    return allTickets;
  }, [allTickets]);

  // Contadores rápidos globales desde el servidor
  const stats = useMemo(() => {
    return {
      reported: statsData?.reported || 0,
      assigned: statsData?.assigned || 0,
      queue: statsData?.queue || 0
    };
  }, [statsData]);

  // Verificar si el usuario tiene algún rol resolutor o es pastor
  const isPastorOrResolver = useMemo(() => {
    if (!user) return false;
    const isPastor = hasRole("ROLE_PASTORES") || hasRole("ROLE_ADMIN");
    const userRoles = user.roles || [];
    const hasResolverRole = userRoles.some(role => {
      const roleName = (typeof role === "object" ? role.name : role) || "";
      const norm = roleName.toUpperCase().replace("ROLE_", "");
      return ["CONEXION", "DESPLIEGUE", "ESENCIA", "LIDER", "ECONOMICO", "ALABANZA", "PROFESORES", "CIMIENTO", "PROTOCOLO", "MINISTERIOS"].includes(norm);
    });
    return isPastor || hasResolverRole;
  }, [user, hasRole]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(0);
  };

  const refetch = () => {
    refetchTickets();
    refetchStats();
  };

  const isLoading = isLoadingTickets || isLoadingStats;
  const isFetching = isFetchingTickets || isFetchingStats;

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-10 lg:p-14 space-y-12 animate-in fade-in duration-700">
      
      <PageHero
        size="medium"
        eyebrow="Canal de Soporte"
        title="Centro de"
        highlight="Solicitudes"
        stats={[
          { label: `${stats.reported + stats.assigned + stats.queue} Solicitudes en total`, variant: "indigo", icon: TicketIcon },
          { label: "Operación en tiempo real", variant: "emerald", icon: RefreshCw },
        ]}
        actions={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-1 active:scale-95 group shrink-0"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            Nueva Solicitud
          </button>
        }
      />

      {/* PESTAÑAS / TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-px">
        <div className="flex flex-wrap gap-2">
          {/* MIS REPORTADOS */}
          <button
            onClick={() => handleTabChange("reported")}
            className={`flex items-center gap-2.5 px-6 py-4 text-sm font-black uppercase tracking-wider rounded-t-2xl transition-all border-b-2 ${
              activeTab === "reported"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Inbox size={16} />
            <span>Mis Reportados</span>
            <span className="ml-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs">
              {stats.reported}
            </span>
          </button>

          {/* MIS ASIGNADOS */}
          <button
            onClick={() => handleTabChange("assigned")}
            className={`flex items-center gap-2.5 px-6 py-4 text-sm font-black uppercase tracking-wider rounded-t-2xl transition-all border-b-2 ${
              activeTab === "assigned"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <UserCheck size={16} />
            <span>Mis Asignados</span>
            <span className="ml-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs">
              {stats.assigned}
            </span>
          </button>

          {/* COLA DE SOPORTE */}
          {isPastorOrResolver && (
            <button
              onClick={() => handleTabChange("queue")}
              className={`flex items-center gap-2.5 px-6 py-4 text-sm font-black uppercase tracking-wider rounded-t-2xl transition-all border-b-2 ${
                activeTab === "queue"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <HelpCircle size={16} />
              <span>Cola de Soporte</span>
              <span className="ml-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs">
                {stats.queue}
              </span>
            </button>
          )}
        </div>

        {/* REFRESCO Y PAGINACIÓN RÁPIDA */}
        <div className="flex items-center gap-3 py-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
            title="Refrescar datos"
          >
            {isFetching ? (
              <Loader2 size={16} className="animate-spin text-indigo-600" />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
        </div>
      </div>

      {/* TABLA O SPINNER */}
      <div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 size={40} className="animate-spin text-indigo-600" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
              Sincronizando con el servidor...
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <TicketsTable tickets={filteredTickets} />

            {/* CONTROL DE PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Página {currentPage + 1} de {totalPages} ({totalElements} solicitudes)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0 || isLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={currentPage >= totalPages - 1 || isLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* MODAL DE CREACIÓN */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};

export default TicketsPage;
