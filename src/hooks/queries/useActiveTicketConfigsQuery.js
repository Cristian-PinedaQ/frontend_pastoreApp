// 🎣 Hook para consultar las categorías activas de tickets
import { useQuery } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";

// Añadiremos la clave de caché de las configuraciones en ticketKeys si no está
// Por ahora useQuery directo con clave manual o llamando a ticketKeys si existe config
export const useActiveTicketConfigsQuery = (options = {}) => {
  return useQuery({
    queryKey: ["tickets", "configs", "active"],
    queryFn: () => ticketApi.getActiveTicketConfigs(),
    staleTime: 60000, // 1 minuto de frescura ya que las categorías cambian poco
    ...options
  });
};

export default useActiveTicketConfigsQuery;
