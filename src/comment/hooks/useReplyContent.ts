import { useQuery } from '@tanstack/react-query';
import { fetchReplyById } from '@/comment/api/reply';

const MAX_SNIPPET_LENGTH = 30;
function getSnippet(content: string) {
  if (!content) return '';
  return content.length > MAX_SNIPPET_LENGTH
    ? content.slice(0, MAX_SNIPPET_LENGTH) + '...'
    : content;
}

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
  const snippet = content ? getSnippet(content) : '';
  return { content, snippet, isLoading, error };
}
