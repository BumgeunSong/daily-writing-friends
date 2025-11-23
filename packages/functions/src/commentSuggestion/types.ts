/**
 * Types for Comment Suggestion Generation
 */

/**
 * 댓글 제안 유형
 * - trait: 성격이나 가치관 인식
 * - highlight: 특정 표현 칭찬
 * - empathy: 감정적 공감
 * - curiosity: 후속 질문
 */
export type SuggestionType = 'trait' | 'highlight' | 'empathy' | 'curiosity';

/**
 * 개별 댓글 제안
 */
export interface CommentSuggestion {
  type: SuggestionType;
  text: string;
}

/**
 * 생성된 댓글 제안 세트
 */
export interface GeneratedSuggestions {
  suggestions: CommentSuggestion[];
  isDefault: boolean;  // true if using fallback for new users
  generatedAt: Date;
}

/**
 * Cloud Function 요청 파라미터
 */
export interface GenerateSuggestionsRequest {
  userId: string;
  postId: string;
  boardId: string;
}

/**
 * Cloud Function 응답
 */
export interface GenerateSuggestionsResponse {
  success: boolean;
  suggestions?: CommentSuggestion[];
  isDefault?: boolean;
  error?: string;
}

/**
 * Gemini API 응답 구조
 */
export interface GeminiSuggestionResponse {
  suggestions: Array<{
    type: string;
    text: string;
  }>;
}