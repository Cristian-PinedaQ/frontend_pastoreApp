// 🎣 Hook para la consulta de detalle de ticket completo
// ✅ Caché optimizada con staleTime
// ✅ Sin polling agresivo innecesario

import { useQuery } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";
import { ticketKeys } from "../ticketKeys";

export const useTicketDetailQuery = (id, options = {}) => {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => ticketApi.getTicketDetail(id),
    staleTime: 5000, // 5 segundos de frescura
    enabled: !!id, // Solo ejecutar si existe un ID válido
    refetchInterval: false, // Desactivar polling activo para detalles
    ...options
  });
};

export default useTicketDetailQuery;
