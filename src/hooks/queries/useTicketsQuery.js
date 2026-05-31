// 🎣 Hook para la consulta de listado de tickets paginado
// ✅ Polling adaptativo
// ✅ Optimizado con staleTime

import { useQuery } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";
import { ticketKeys } from "../ticketKeys";

export const useTicketsQuery = (page = 0, size = 10, options = {}) => {
  return useQuery({
    queryKey: ticketKeys.list(page, size),
    queryFn: () => ticketApi.getTickets(page, size),
    staleTime: 10000, // 10 segundos de frescura
    refetchInterval: 15000, // Polling de 15 segundos
    refetchIntervalInBackground: false, // Pausar polling si la pestaña está en segundo plano
    refetchOnWindowFocus: true, // Refetch inmediato al recuperar el foco de la ventana
    ...options
  });
};

export default useTicketsQuery;
