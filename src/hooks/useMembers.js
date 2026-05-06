import { useQuery } from '@tanstack/react-query';
import apiService from '../apiService';

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: () => apiService.getAllMembers(),
    staleTime: 5 * 60 * 1000,
  });
}

export default useMembers;
