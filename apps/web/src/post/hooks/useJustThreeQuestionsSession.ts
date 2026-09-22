import { useState } from 'react';
import type { JustThreeQuestionAnswer } from '@/post/utils/justThreeQuestionsContentUtils';

const TOTAL_QUESTION_COUNT = 3;

function pickRandomQuestion(pool: readonly string[]): { question: string; remainingPool: string[] } {
  const randomIndex = Math.floor(Math.random() * pool.length);
  const question = pool[randomIndex];
  const remainingPool = pool.filter((_, index) => index !== randomIndex);
  return { question, remainingPool };
}

interface QuestionSession {
  remainingPool: string[];
  currentQuestion: string;
  answers: JustThreeQuestionAnswer[];
}

function createInitialSession(pool: readonly string[]): QuestionSession {
  const { question, remainingPool } = pickRandomQuestion(pool);
  return { remainingPool, currentQuestion: question, answers: [] };
}

export interface UseJustThreeQuestionsSessionResult {
  currentQuestion: string;
  answers: JustThreeQuestionAnswer[];
  progress: number;
  isComplete: boolean;
  canSkip: boolean;
  skip: () => void;
  recordAnswer: (answer: string) => void;
}

/**
 * 질문 풀에서 랜덤 추출/제거를 관리하는 세션 상태.
 * pool은 admin이 관리하는 DB 목록에서 가져온 값으로, 최소 1개 이상 채워진
 * 상태로 호출해야 한다 (호출부가 로딩/빈 풀을 먼저 처리).
 * 제출(네트워크 호출)은 페이지 컴포넌트가 담당한다.
 */
export function useJustThreeQuestionsSession(pool: readonly string[]): UseJustThreeQuestionsSessionResult {
  const [session, setSession] = useState<QuestionSession>(() => createInitialSession(pool));

  const isComplete = session.answers.length >= TOTAL_QUESTION_COUNT;
  const canSkip = session.remainingPool.length > 0;

  const skip = () => {
    if (!canSkip) return;
    setSession((previousSession) => {
      const { question, remainingPool } = pickRandomQuestion(previousSession.remainingPool);
      return { ...previousSession, currentQuestion: question, remainingPool };
    });
  };

  const recordAnswer = (answer: string) => {
    setSession((previousSession) => {
      const nextAnswers = [
        ...previousSession.answers,
        { question: previousSession.currentQuestion, answer },
      ];

      const hasNextQuestion = nextAnswers.length < TOTAL_QUESTION_COUNT && previousSession.remainingPool.length > 0;
      if (!hasNextQuestion) {
        return { ...previousSession, answers: nextAnswers };
      }

      const { question, remainingPool } = pickRandomQuestion(previousSession.remainingPool);
      return { remainingPool, currentQuestion: question, answers: nextAnswers };
    });
  };

  return {
    currentQuestion: session.currentQuestion,
    answers: session.answers,
    progress: session.answers.length,
    isComplete,
    canSkip,
    skip,
    recordAnswer,
  };
}
