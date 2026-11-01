import { useQuery, type QueryKey } from '@tanstack/react-query';
import {
  getReactions,
  fetchBatchReactionsForComments,
} from '@/comment/external/reaction.api';
import { useComments } from '@/comment/hooks/useComments';
import { type ReactionMutations, useReactionMutations } from '@/comment/hooks/useReactionMutations';
import type { CommentParams, GroupedReaction, ReplyParams } from '@/comment/model/Reaction';
import { groupReactionsByEmoji } from '@/comment/utils/reactionUtils';

export interface UseReactionsReturn extends ReactionMutations {
  reactions: GroupedReaction[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useCommentReactions(entity: CommentParams): UseReactionsReturn {
  const { boardId, postId, commentId } = entity;
  const { comments } = useComments(boardId, postId);
  const commentIds = comments.map((comment) => comment.id);
  const commentIdsKey = [...commentIds].sort((a, b) => a.localeCompare(b)).join(',');

  const { data: reactions = [], isLoading, isError, error } = useQuery({
    queryKey: [...commentReactionsKeyPrefix(boardId, postId), commentIdsKey],
    queryFn: async () =>
      (await fetchBatchReactionsForComments(commentIds)).match(
        (reactionsByComment) => reactionsByComment,
        (fetchError) => {
          throw fetchError;
        },
      ),
    select: (reactionsByComment) =>
      groupReactionsByEmoji(reactionsByComment.get(commentId) ?? []),
    keepPreviousData: true,
    suspense: true,
    useErrorBoundary: false,
  });

  const mutations = useReactionMutations(entity, commentReactionsKeyPrefix(boardId, postId));
  return { reactions, isLoading, isError, error: error as Error | null, ...mutations };
}

export function useReplyReactions(entity: ReplyParams): UseReactionsReturn {
  const { boardId, postId, commentId, replyId } = entity;
  const queryKey = ['reactions', boardId, postId, commentId, replyId];

  const { data: reactions = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () =>
      groupReactionsByEmoji(
        (await getReactions(entity)).match(
          (list) => list,
          (fetchError) => {
            throw fetchError;
          },
        ),
      ),
    suspense: true,
    useErrorBoundary: false,
  });

  const mutations = useReactionMutations(entity, queryKey);
  return { reactions, isLoading, isError, error: error as Error | null, ...mutations };
}

function commentReactionsKeyPrefix(boardId: string, postId: string): QueryKey {
  return ['commentReactions', boardId, postId];
}
