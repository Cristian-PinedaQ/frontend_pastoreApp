// 🔌 Servicio API para el módulo de Tickets
// ✅ Validaciones de borde en el cliente
// ✅ Desacoplado de apiService.js

import apiService from "../apiService";

const validateId = (id, fieldName = 'ID') => {
  if (!id || isNaN(id) || parseInt(id) <= 0) {
    throw new Error(`${fieldName} inválido`);
  }
};

export const ticketApi = {
  // 1. Obtener todas las categorías de configuración (Solo PASTORES)
  async getTicketConfigs() {
    return apiService.request('/tickets/configs');
  },

  // 2. Obtener categorías activas (para dropdowns de creación)
  async getActiveTicketConfigs() {
    return apiService.request('/tickets/configs/active');
  },

  // 3. Crear categoría de ticket (Solo PASTORES)
  async createTicketConfig(configData) {
    if (!configData || typeof configData !== 'object') {
      throw new Error('Datos de configuración requeridos');
    }
    return apiService.request('/tickets/configs', {
      method: 'POST',
      body: JSON.stringify(configData),
    });
  },

  // 4. Editar categoría de ticket (Solo PASTORES)
  async updateTicketConfig(id, configData) {
    validateId(id, 'configId');
    if (!configData || typeof configData !== 'object') {
      throw new Error('Datos de configuración requeridos');
    }
    return apiService.request(`/tickets/configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  },

  // 5. Eliminar categoría de ticket (Solo PASTORES)
  async deleteTicketConfig(id) {
    validateId(id, 'configId');
    return apiService.request(`/tickets/configs/${id}`, {
      method: 'DELETE',
    });
  },

  // 6. Listar todos los tickets visibles (paginado, filtrado por el backend)
  async getTickets(page = 0, size = 10) {
    return apiService.request(`/tickets?page=${page}&size=${size}`);
  },

  // 7. Obtener el detalle completo de un ticket
  async getTicketDetail(id) {
    validateId(id, 'ticketId');
    return apiService.request(`/tickets/${id}`);
  },

  // 8. Crear un nuevo ticket
  async createTicket(ticketData) {
    if (!ticketData || typeof ticketData !== 'object') {
      throw new Error('Datos de ticket requeridos');
    }
    return apiService.request('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
  },

  // 9. Actualizar estado del ticket (sigue la máquina de estados)
  async updateTicketStatus(id, statusData) {
    validateId(id, 'ticketId');
    if (!statusData || typeof statusData !== 'object') {
      throw new Error('Datos de estado requeridos');
    }
    return apiService.request(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    });
  },

  // 10. Reclamar / Asignar ticket (First-Claim Wins)
  async assignTicket(id, assignData) {
    validateId(id, 'ticketId');
    if (!assignData || typeof assignData !== 'object') {
      throw new Error('Datos de asignación requeridos');
    }
    return apiService.request(`/tickets/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(assignData),
    });
  },

  // 11. Añadir comentario o respuesta (inmutable)
  async addTicketResponse(id, responseData) {
    validateId(id, 'ticketId');
    if (!responseData || typeof responseData !== 'object') {
      throw new Error('Datos de respuesta requeridos');
    }
    return apiService.request(`/tickets/${id}/responses`, {
      method: 'POST',
      body: JSON.stringify(responseData),
    });
  },

  // 12. Reasignar ticket (Solo PASTORES y ADMIN)
  async reassignTicket(id, reassignData) {
    validateId(id, 'ticketId');
    if (!reassignData || typeof reassignData !== 'object') {
      throw new Error('Datos de reasignación requeridos');
    }
    return apiService.request(`/tickets/${id}/reassign`, {
      method: 'PATCH',
      body: JSON.stringify(reassignData),
    });
  },

  // 13. Obtener resolvers elegibles para reasignar este ticket
  async getEligibleResolvers(id) {
    validateId(id, 'ticketId');
    return apiService.request(`/tickets/${id}/eligible-resolvers`);
  }
};

export default ticketApi;
