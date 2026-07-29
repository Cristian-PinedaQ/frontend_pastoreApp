import { useQuery } from '@tanstack/react-query';
import { geoApi } from '../services/geoApi';

/**
 * Hook para obtener miembros geolocalizados con caché y reactividad ante filtros.
 */
export function useGeoMembers(filters = {}) {
  return useQuery({
    queryKey: ['geo-members', filters],
    queryFn: ({ signal }) => geoApi.getMembers(filters, signal),
    staleTime: 5 * 60 * 1000, // 5 minutos de validez de caché
    refetchOnWindowFocus: false,
    keepPreviousData: true, // Evita parpadeos en el mapa al aplicar filtros
  });
}
