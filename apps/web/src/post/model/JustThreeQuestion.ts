/** id는 개인화 질문의 행 id, 공통 질문은 null. */
export interface QuestionCandidate {
  id: string | null;
  text: string;
}

export type QuestionType = 'common' | 'personalized';

export function toQuestionType(questionId: string | null): QuestionType {
  return questionId ? 'personalized' : 'common';
}
