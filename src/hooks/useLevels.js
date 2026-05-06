import { useQuery } from '@tanstack/react-query';
import apiService from '../apiService';

export function useLevels() {
  return useQuery({
    queryKey: ['levels'],
    queryFn: () => apiService.getActiveLevels(),
    staleTime: 10 * 60 * 1000,
  });
}

export default useLevels;
