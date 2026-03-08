import { useQuery } from '@tanstack/react-query';
import { fetchReplyById } from '@/comment/api/reply';

export function useReplyContent(
  boardId: string,
  postId: string,
  commentId: string,
  replyId: string,
  options?: { enabled?: boolean }
) {
  const {
    data: reply,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reply', boardId, postId, commentId, replyId],
    queryFn: () => fetchReplyById(boardId, postId, commentId, replyId),
    enabled: options?.enabled !== undefined ? options.enabled : (!!boardId && !!postId && !!commentId && !!replyId),
    retry: false, // Don't retry for potentially deleted replies
  });
  const content = reply?.content ?? null;
  return { content, isLoading, error };
}
