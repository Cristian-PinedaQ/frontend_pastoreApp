// 🎣 Hook de mutación para crear un ticket
// ✅ Invalidación de queries tras éxito

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";
import { ticketKeys } from "../ticketKeys";

export const useCreateTicketMutation = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketData) => ticketApi.createTicket(ticketData),
    onSuccess: (data, variables, context) => {
      // Invalidar todas las consultas de listados para forzar recarga
      queryClient.invalidateQueries({
        queryKey: ticketKeys.lists()
      });
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    ...options
  });
};

export default useCreateTicketMutation;
