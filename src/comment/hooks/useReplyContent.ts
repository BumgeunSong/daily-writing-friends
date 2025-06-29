import { useQuery } from '@tanstack/react-query';
import { fetchReplyById } from '@/comment/api/reply';

export function useReplyContent(
  boardId: string,
  postId: string,
  commentId: string,
  replyId: string,
) {
  const {
    data: reply,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reply', boardId, postId, commentId, replyId],
    queryFn: () => fetchReplyById(boardId, postId, commentId, replyId),
    enabled: !!boardId && !!postId && !!commentId && !!replyId,
  });
  const content = reply?.content ?? null;
  return { content, isLoading, error };
}
