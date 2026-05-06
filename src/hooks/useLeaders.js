import { useQuery } from '@tanstack/react-query';
import apiService from '../apiService';

export function useLeaders() {
  return useQuery({
    queryKey: ['leaders'],
    queryFn: () => apiService.getActiveLeaders(),
    staleTime: 5 * 60 * 1000,
  });
}

export default useLeaders;
