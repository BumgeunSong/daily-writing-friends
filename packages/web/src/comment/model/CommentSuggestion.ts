/**
 * Types for comment suggestions
 */
export type SuggestionType = 'trait' | 'highlight' | 'empathy' | 'curiosity';

export interface CommentSuggestion {
  type: SuggestionType;
  text: string;
}

export interface GenerateCommentSuggestionsRequest {
  userId: string;
  postId: string;
  boardId: string;
}

export interface GenerateCommentSuggestionsResponse {
  success: boolean;
  suggestions?: CommentSuggestion[];
  isDefault?: boolean;
  error?: string;
}