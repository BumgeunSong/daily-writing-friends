import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { generateCommentSuggestions } from '../api/commentSuggestions';
import type { CommentSuggestion } from '../model/CommentSuggestion';


interface UseCommentSuggestionsParams {
  postId: string;
  boardId: string;
  enabled?: boolean;
}

/**
 * Custom hook to generate comment suggestions using TanStack Query
 * Based on comment_assistant_prd.md specifications
 */
export function useCommentSuggestions({ 
  postId, 
  boardId, 
  enabled = true 
}: UseCommentSuggestionsParams) {
  const { currentUser } = useAuth();

  const queryFn = async (): Promise<CommentSuggestion[]> => {
    if (!currentUser?.uid) {
      throw new Error('User not authenticated');
    }

    return generateCommentSuggestions({
      userId: currentUser.uid,
      postId,
      boardId,
    });
  };

  const queryEnabled = enabled && !!currentUser?.uid && !!postId && !!boardId;
  
  return useQuery({
    queryKey: ['commentSuggestions', currentUser?.uid, postId, boardId],
    queryFn,
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes cache as per PRD
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });
}