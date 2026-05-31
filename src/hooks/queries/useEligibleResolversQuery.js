// 🎣 Hook para consultar la lista de resolvers elegibles para reasignar un ticket
// ✅ Caché optimizada
// ✅ Ejecución controlada mediante el flag enabled

import { useQuery } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";
import { ticketKeys } from "../ticketKeys";

export const useEligibleResolversQuery = (id, options = {}) => {
  return useQuery({
    queryKey: ticketKeys.eligibleResolvers(id),
    queryFn: () => ticketApi.getEligibleResolvers(id),
    staleTime: 60000, // 1 minuto de frescura (no cambia tan seguido)
    enabled: !!id, // Solo ejecutar si existe un ID válido
    ...options
  });
};

export default useEligibleResolversQuery;
