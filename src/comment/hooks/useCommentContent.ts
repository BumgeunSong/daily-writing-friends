import { useQuery } from '@tanstack/react-query';
import { fetchCommentById } from '@/comment/api/comment';

export function useCommentContent(boardId: string, postId: string, commentId: string) {
  const {
    data: comment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['comment', boardId, postId, commentId],
    queryFn: () => fetchCommentById(boardId, postId, commentId),
    enabled: !!boardId && !!postId && !!commentId,
  });
  const content = comment?.content ?? null;
  return { content, isLoading, error };
}
