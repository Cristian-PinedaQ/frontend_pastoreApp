const cleanId = (id) => {
  if (id === undefined || id === null) return id;
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? id : parsed;
};

export const ticketKeys = {
  all: ["tickets"],
  lists: () => [...ticketKeys.all, "list"],
  list: (filter, page, size) => [...ticketKeys.lists(), filter, page, size],
  details: () => [...ticketKeys.all, "detail"],
  detail: (id) => [...ticketKeys.details(), cleanId(id)],
  configs: () => [...ticketKeys.all, "configs"],
  activeConfigs: () => [...ticketKeys.configs(), "active"],
  eligibleResolvers: (id) => [...ticketKeys.detail(id), "eligible-resolvers"],
  stats: () => [...ticketKeys.all, "stats"]
};

export default ticketKeys;
