// 🎣 Hook de mutación para agregar comentarios (respuestas append-only)
// ✅ Invalidación inmediata del detalle del ticket para actualizar el hilo

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketApi } from "../../services/ticketApi";
import { ticketKeys } from "../ticketKeys";

export const useAddCommentMutation = (options = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, responseData }) => ticketApi.addTicketResponse(id, responseData),
    
    onSuccess: (data, { id }, context) => {
      // Invalidar y refrescar la vista detallada del ticket para mostrar el comentario inmediatamente
      queryClient.invalidateQueries({
        queryKey: ticketKeys.detail(id)
      });
      
      if (options.onSuccess) {
        options.onSuccess(data, { id }, context);
      }
    },
    ...options
  });
};

export default useAddCommentMutation;
