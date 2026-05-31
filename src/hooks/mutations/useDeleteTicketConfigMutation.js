// 🎣 Hook para eliminar configuraciones de categoría de tickets
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";

export const useDeleteTicketConfigMutation = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => ticketApi.deleteTicketConfig(id),
    onSuccess: (data, variables, context) => {
      // Invalidar caché
      queryClient.invalidateQueries({ queryKey: ["tickets", "configs"] });
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    ...options
  });
};

export default useDeleteTicketConfigMutation;
