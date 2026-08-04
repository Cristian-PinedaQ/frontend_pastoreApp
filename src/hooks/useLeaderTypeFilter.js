import { useMemo } from "react";
import { useLeaders } from "./useLeaders";

export function useLeaderTypeFilter(selectedLeaderType) {
  const { data: leadersData, isLoading } = useLeaders();

  const filterByLeaderType = useMemo(() => {
    // Si se solicitan "Todos", no hay filtro, pasan todos (incluyendo los que no tengan miembro)
    if (selectedLeaderType === "ALL") {
      return () => true;
    }

    const leaders = Array.isArray(leadersData) ? leadersData : [];

    if (selectedLeaderType === "NO_LEADER") {
      const allLeaderIds = new Set(leaders.map((l) => l.memberId));
      return (memberId) => {
        // Si no tiene miembro asociado, por definición no tiene liderazgo.
        if (memberId == null) return true;
        return !allLeaderIds.has(memberId);
      };
    }

    const memberIdsWithType = new Set(
      leaders
        .filter((l) => l.leaderType === selectedLeaderType)
        .map((l) => l.memberId)
    );

    return (memberId) => {
      // Si estamos buscando un tipo específico de líder y la transacción
      // no tiene miembro, entonces no coincide.
      if (memberId == null) return false;
      return memberIdsWithType.has(memberId);
    };
  }, [leadersData, selectedLeaderType]);

  return { filterByLeaderType, isLoadingLeaders: isLoading, leadersData };
}
