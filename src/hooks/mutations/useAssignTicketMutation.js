// 🎣 Hook de mutación para asignar o reclamar un ticket (First-Claim Wins)
// ✅ Actualización optimista de la caché
// ✅ Rollback nativo automático en onError
// ✅ Reconciliación con el servidor en onSettled

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";
import { ticketKeys } from "../ticketKeys";

export const useAssignTicketMutation = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, assignData }) => ticketApi.assignTicket(id, assignData),
    
    onMutate: async ({ id, assignData }) => {
      // 1. Cancelar cualquier refetch saliente para no sobrescribir el estado optimista
      await queryClient.cancelQueries({
        queryKey: ticketKeys.detail(id)
      });

      // 2. Capturar el estado anterior de la caché como snapshot
      const previousTicket = queryClient.getQueryData(ticketKeys.detail(id));

      // 3. Modificar la caché optimísticamente con la suposición de éxito
      if (previousTicket) {
        queryClient.setQueryData(ticketKeys.detail(id), (old) => {
          if (!old) return old;
          
          // Suponer asignación del usuario actual o del ID enviado
          const currentUsername = sessionStorage.getItem("user") 
            ? JSON.parse(sessionStorage.getItem("user")).username 
            : "Reclamado";

          return {
            ...old,
            assignedToId: assignData.assignedToId,
            assignedToName: currentUsername,
            status: old.status === "ABIERTO" && assignData.assignedToId !== null ? "EN_PROCESO" : old.status
          };
        });
      }

      // 4. Retornar el contexto con el snapshot previo para el rollback
      return { previousTicket };
    },

    onError: (err, { id }, context) => {
      // Si la mutación falla (ej. colisión 409 o 403), hacer rollback con el snapshot previo
      if (context?.previousTicket) {
        queryClient.setQueryData(ticketKeys.detail(id), context.previousTicket);
      }
      if (options.onError) {
        options.onError(err, { id }, context);
      }
    },

    onSettled: (data, error, { id }) => {
      // Reconciliación forzada con el servidor: invalidar caché para descargar el estado real
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      
      if (options.onSettled) {
        options.onSettled(data, error, { id });
      }
    },
    ...options
  });
};

export default useAssignTicketMutation;
