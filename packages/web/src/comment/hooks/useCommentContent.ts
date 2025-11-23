import { useQuery } from '@tanstack/react-query';
import { fetchCommentById } from '@/comment/api/comment';

export function useCommentContent(
  boardId: string,
  postId: string,
  commentId: string,
  options?: { enabled?: boolean }
) {
  const {
    data: comment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['comment', boardId, postId, commentId],
    queryFn: () => fetchCommentById(boardId, postId, commentId),
    enabled: options?.enabled !== undefined ? options.enabled : (!!boardId && !!postId && !!commentId),
    retry: false, // Don't retry for potentially deleted comments
  });
  const content = comment?.content ?? null;
  return { content, isLoading, error };
}
