import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { geoApi } from '../services/geoApi';

export function useGeoCells(filters = {}) {
  return useQuery({
    queryKey: ['geo-cells', filters],
    queryFn: ({ signal }) => geoApi.getCells(filters, signal),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}