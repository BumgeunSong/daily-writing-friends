import { useQuery } from '@tanstack/react-query';
import { fetchCommentById } from '@/comment/api/comment';

const MAX_SNIPPET_LENGTH = 30;
function getSnippet(content: string) {
  if (!content) return '';
  return content.length > MAX_SNIPPET_LENGTH
    ? content.slice(0, MAX_SNIPPET_LENGTH) + '...'
    : content;
}

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
  const snippet = content ? getSnippet(content) : '';
  return { content, snippet, isLoading, error };
}
