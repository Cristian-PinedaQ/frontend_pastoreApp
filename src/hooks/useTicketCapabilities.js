// 🎣 Hook adaptador de capacidades de Tickets
// ✅ Las capabilities vienen 100% del backend (Backend Workflow Engine)
// ✅ Sin lógica de roles en el cliente — Dumb Client

const DEFAULT_CAPABILITIES = {
  canClaim: false,
  canComment: false,
  canPrivateNote: false,
  allowedTransitions: [],
  isPastor: false,
  isAssigned: false,
  isCreator: false,
  isResolver: false,
  hasEditAccess: false,
  assignedRole: "NONE",
};

const useTicketCapabilities = (ticket) => {
  return ticket?.capabilities ?? DEFAULT_CAPABILITIES;
};

export default useTicketCapabilities;
