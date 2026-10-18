import { useState } from 'react';
import type { JustThreeQuestionAnswer } from '@/post/utils/justThreeQuestionsContentUtils';

const TOTAL_QUESTION_COUNT = 3;

/** id는 개인화 질문의 행 id, 공통 질문은 null. */
export interface QuestionCandidate {
  id: string | null;
  text: string;
}

function pickRandomQuestion(pool: readonly QuestionCandidate[]): {
  question: QuestionCandidate;
  remainingPool: QuestionCandidate[];
} {
  const randomIndex = Math.floor(Math.random() * pool.length);
  const question = pool[randomIndex];
  const remainingPool = pool.filter((_, index) => index !== randomIndex);
  return { question, remainingPool };
}

interface QuestionSession {
  remainingPool: QuestionCandidate[];
  currentQuestion: QuestionCandidate;
  answers: JustThreeQuestionAnswer[];
}

function createInitialSession(pool: readonly QuestionCandidate[]): QuestionSession {
  const { question, remainingPool } = pickRandomQuestion(pool);
  return { remainingPool, currentQuestion: question, answers: [] };
}

export interface UseJustThreeQuestionsSessionResult {
  currentQuestion: string;
  currentQuestionId: string | null;
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
export function useJustThreeQuestionsSession(pool: readonly QuestionCandidate[]): UseJustThreeQuestionsSessionResult {
  const [session, setSession] = useState<QuestionSession>(() => createInitialSession(pool));

  const isComplete = session.answers.length >= TOTAL_QUESTION_COUNT;
  const remainingQuestionsNeeded = TOTAL_QUESTION_COUNT - session.answers.length - 1;
  const canSkip = session.remainingPool.length > remainingQuestionsNeeded;

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
        {
          question: previousSession.currentQuestion.text,
          questionId: previousSession.currentQuestion.id,
          answer,
        },
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
    currentQuestion: session.currentQuestion.text,
    currentQuestionId: session.currentQuestion.id,
    answers: session.answers,
    progress: session.answers.length,
    isComplete,
    canSkip,
    skip,
    recordAnswer,
  };
}
