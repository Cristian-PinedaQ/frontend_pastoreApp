import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { geoApi } from '../services/geoApi';

export function useGeoMembersMissing() {
  return useQuery({
    queryKey: ['geo-members-missing'],
    queryFn: ({ signal }) => geoApi.getMembersMissing(signal),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useGeoMembersFailed() {
  return useQuery({
    queryKey: ['geo-members-failed'],
    queryFn: ({ signal }) => geoApi.getMembersFailed(signal),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}