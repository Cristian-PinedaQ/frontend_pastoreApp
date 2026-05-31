// 🔑 Registro centralizado de claves de consulta para React Query

export const ticketKeys = {
  all: ["tickets"],
  lists: () => [...ticketKeys.all, "list"],
  list: (page, size) => [...ticketKeys.lists(), page, size],
  details: () => [...ticketKeys.all, "detail"],
  detail: (id) => [...ticketKeys.details(), id],
  configs: () => [...ticketKeys.all, "configs"],
  activeConfigs: () => [...ticketKeys.configs(), "active"],
  eligibleResolvers: (id) => [...ticketKeys.detail(id), "eligible-resolvers"]
};

export default ticketKeys;
