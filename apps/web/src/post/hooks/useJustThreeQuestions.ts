import { useQuery } from '@tanstack/react-query';
import { fetchJustThreeQuestions } from '@/post/external/justThreeQuestions.api';
import type { QuestionCandidate } from '@/post/hooks/useJustThreeQuestionsSession';

async function fetchCommonQuestionCandidates(): Promise<QuestionCandidate[]> {
  const questions = await fetchJustThreeQuestions();
  return questions.map((text) => ({ id: null, text }));
}

export function useJustThreeQuestions() {
  return useQuery({
    queryKey: ['justThreeQuestions'],
    queryFn: fetchCommonQuestionCandidates,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
  });
}
