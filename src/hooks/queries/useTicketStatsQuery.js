// 🎣 Hook para la consulta de estadísticas globales de tickets (conteos por pestaña)
import { useQuery } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";

export const useTicketStatsQuery = (options = {}) => {
  return useQuery({
    queryKey: ["tickets", "stats"],
    queryFn: () => ticketApi.getTicketStats(),
    staleTime: 10000, // 10 segundos de frescura
    refetchInterval: 15000, // Polling de 15 segundos
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    ...options
  });
};

export default useTicketStatsQuery;
