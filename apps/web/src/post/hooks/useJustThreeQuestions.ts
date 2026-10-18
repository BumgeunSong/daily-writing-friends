import { useQuery } from '@tanstack/react-query';
import { fetchJustThreeQuestions, fetchPersonalizedQuestions } from '@/post/external/justThreeQuestions.api';
import type { QuestionCandidate } from '@/post/hooks/useJustThreeQuestionsSession';

async function fetchCommonQuestionCandidates(): Promise<QuestionCandidate[]> {
  const questions = await fetchJustThreeQuestions();
  return questions.map((text) => ({ id: null, text }));
}

/** 개인화 질문은 부가 기능이라 실패해도 세션을 막지 않고 빈 목록으로 폴백한다. */
async function fetchPersonalizedQuestionCandidates(userId: string): Promise<QuestionCandidate[]> {
  try {
    const questions = await fetchPersonalizedQuestions(userId);
    return questions.map(({ id, question }) => ({ id, text: question }));
  } catch (error) {
    console.error('개인화 질문 조회 실패, 공통 질문만 사용합니다:', error);
    return [];
  }
}

async function fetchQuestionCandidates(userId: string | null): Promise<QuestionCandidate[]> {
  const [common, personalized] = await Promise.all([
    fetchCommonQuestionCandidates(),
    userId === null ? [] : fetchPersonalizedQuestionCandidates(userId),
  ]);
  return [...common, ...personalized];
}

export function useJustThreeQuestions(userId: string | null) {
  return useQuery({
    queryKey: ['justThreeQuestions', userId],
    queryFn: () => fetchQuestionCandidates(userId),
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
  });
}
