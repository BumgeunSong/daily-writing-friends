import { useQuery } from '@tanstack/react-query';
import { fetchJustThreeQuestions } from '@/post/external/justThreeQuestions.api';

export function useJustThreeQuestions() {
  return useQuery(['justThreeQuestions'], fetchJustThreeQuestions, {
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
  });
}
