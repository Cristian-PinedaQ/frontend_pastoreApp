import { useQuery } from '@tanstack/react-query';
import { geoApi } from '../services/geoApi';

/**
 * Hook para obtener células geolocalizadas con caché y reactividad ante filtros.
 */
export function useGeoCells(filters = {}) {
  return useQuery({
    queryKey: ['geo-cells', filters],
    queryFn: ({ signal }) => geoApi.getCells(filters, signal),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
}
