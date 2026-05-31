// 🎣 Hook de mutación para reasignar un ticket a otro responsable (Solo PASTORES y ADMIN)
// ✅ Actualización optimista de la caché
// ✅ Rollback automático en caso de error
// ✅ Reconciliación con el servidor en onSettled

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";
import { ticketKeys } from "../ticketKeys";

export const useReassignTicketMutation = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reassignData }) => ticketApi.reassignTicket(id, reassignData),

    onMutate: async ({ id, reassignData }) => {
      // 1. Cancelar cualquier refetch en curso
      await queryClient.cancelQueries({
        queryKey: ticketKeys.detail(id)
      });

      // 2. Guardar snapshot previo de la caché
      const previousTicket = queryClient.getQueryData(ticketKeys.detail(id));

      // 3. Modificación optimista si existe el ticket en la caché
      if (previousTicket) {
        queryClient.setQueryData(ticketKeys.detail(id), (old) => {
          if (!old) return old;
          return {
            ...old,
            assignedToId: reassignData.assignedToId,
            // Ponemos temporalmente "Cargando..." o similar hasta que el backend retorne el nombre real
            assignedToName: "Actualizando...",
            status: old.status === "ABIERTO" ? "EN_PROCESO" : old.status
          };
        });
      }

      return { previousTicket };
    },

    onError: (err, { id }, context) => {
      // Rollback al estado anterior si ocurre error (ej: conflicto de concurrencia)
      if (context?.previousTicket) {
        queryClient.setQueryData(ticketKeys.detail(id), context.previousTicket);
      }
      if (options.onError) {
        options.onError(err, { id }, context);
      }
    },

    onSettled: (data, error, { id }) => {
      // Forzar recarga desde el backend
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });

      if (options.onSettled) {
        options.onSettled(data, error, { id });
      }
    },
    ...options
  });
};

export default useReassignTicketMutation;
