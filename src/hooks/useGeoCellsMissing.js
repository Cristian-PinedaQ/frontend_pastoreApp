import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { geoApi } from '../services/geoApi';

export function useGeoCellsMissing() {
  return useQuery({
    queryKey: ['geo-cells-missing'],
    queryFn: ({ signal }) => geoApi.getCellsMissing(signal),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useGeoCellsFailed() {
  return useQuery({
    queryKey: ['geo-cells-failed'],
    queryFn: ({ signal }) => geoApi.getCellsFailed(signal),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}