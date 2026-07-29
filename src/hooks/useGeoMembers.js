import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { geoApi } from '../services/geoApi';

export function useGeoMembers(filters = {}) {
  return useQuery({
    queryKey: ['geo-members', filters],
    queryFn: ({ signal }) => geoApi.getMembers(filters, signal),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}