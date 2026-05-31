// 🎣 Hook para crear configuraciones de categoría de tickets
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";

export const useCreateTicketConfigMutation = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configData) => ticketApi.createTicketConfig(configData),
    onSuccess: (data, variables, context) => {
      // Invalidar las consultas de configuraciones activas y generales
      queryClient.invalidateQueries({ queryKey: ["tickets", "configs"] });
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    ...options
  });
};

export default useCreateTicketConfigMutation;
