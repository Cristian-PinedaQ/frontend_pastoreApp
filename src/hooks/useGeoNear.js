import { useQuery } from '@tanstack/react-query';
import { geoApi } from '../services/geoApi';

/**
 * Hook para consultar entidades cercanas a una coordenada específica.
 */
export function useGeoNear(lat, lng, radiusKm = 2.0, enabled = false) {
  return useQuery({
    queryKey: ['geo-near', lat, lng, radiusKm],
    queryFn: ({ signal }) => geoApi.getNear(lat, lng, radiusKm, signal),
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
