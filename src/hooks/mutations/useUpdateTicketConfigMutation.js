// 🎣 Hook para actualizar configuraciones de categoría de tickets
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";

export const useUpdateTicketConfigMutation = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, configData }) => ticketApi.updateTicketConfig(id, configData),
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

export default useUpdateTicketConfigMutation;
