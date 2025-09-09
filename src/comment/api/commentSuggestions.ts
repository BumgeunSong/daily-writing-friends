import type { CommentSuggestion } from '../hooks/useCommentSuggestions';

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

/**
 * Generate comment suggestions using the Cloud Function
 */
export async function generateCommentSuggestions(
  request: GenerateCommentSuggestionsRequest
): Promise<CommentSuggestion[]> {
  const response = await fetch('https://generatecommentsuggestions-ifrsorhslq-uc.a.run.app', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to generate suggestions`);
  }

  const data: GenerateCommentSuggestionsResponse = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to generate suggestions');
  }

  return data.suggestions || [];
}