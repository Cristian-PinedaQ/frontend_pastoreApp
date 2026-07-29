import { useQuery } from '@tanstack/react-query';
import { geoApi } from '../services/geoApi';

/**
 * Hook para obtener estadísticas de geocodificación del backend.
 */
export function useGeoStats() {
  return useQuery({
    queryKey: ['geo-stats'],
    queryFn: ({ signal }) => geoApi.getStats(signal),
    staleTime: 30 * 1000, // Datos frescos por 30 segundos
    refetchOnWindowFocus: true,
  });
}
