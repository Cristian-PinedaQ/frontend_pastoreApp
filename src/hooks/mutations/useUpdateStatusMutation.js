// 🎣 Hook de mutación para cambiar el estado de un ticket (Máquina de estados)
// ✅ Actualización optimista del estado visual en caché
// ✅ Rollback automático en onError si la acción es rechazada
// ✅ Invalidación e invalidación de cola en onSettled

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";
import { ticketKeys } from "../ticketKeys";

export const useUpdateStatusMutation = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, statusData }) => ticketApi.updateTicketStatus(id, statusData),
    
    onMutate: async ({ id, statusData }) => {
      // 1. Cancelar refetches salientes
      await queryClient.cancelQueries({
        queryKey: ticketKeys.detail(id)
      });

      // 2. Tomar snapshot de la caché anterior
      const previousTicket = queryClient.getQueryData(ticketKeys.detail(id));

      // 3. Modificar la caché optimísticamente
      if (previousTicket) {
        queryClient.setQueryData(ticketKeys.detail(id), (old) => {
          if (!old) return old;
          return {
            ...old,
            status: statusData.status
          };
        });
      }

      // 4. Retornar el snapshot anterior para rollback
      return { previousTicket };
    },

    onError: (err, { id }, context) => {
      // Rollback al estado previo si falla la mutación
      if (context?.previousTicket) {
        queryClient.setQueryData(ticketKeys.detail(id), context.previousTicket);
      }
      if (options.onError) {
        options.onError(err, { id }, context);
      }
    },

    onSettled: (data, error, { id }) => {
      // Reconciliación con el servidor
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      
      if (options.onSettled) {
        options.onSettled(data, error, { id });
      }
    },
    ...options
  });
};

export default useUpdateStatusMutation;
