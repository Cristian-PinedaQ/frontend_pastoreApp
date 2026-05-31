// 🎣 Hook para consultar todas las categorías de tickets (Solo PASTORES)
import { useQuery } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";

export const useTicketConfigsQuery = (options = {}) => {
  return useQuery({
    queryKey: ["tickets", "configs", "all"],
    queryFn: () => ticketApi.getTicketConfigs(),
    staleTime: 30000,
    ...options
  });
};

export default useTicketConfigsQuery;
