import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import {
  type GetReactionsParams,
  getReactions,
  fetchBatchReactionsForComments,
  createReaction,
  deleteUserReaction
} from '@/comment/external/reaction.api';
import { useComments } from '@/comment/hooks/useComments';
import type { GroupedReaction, ReactionUser } from '@/comment/model/Reaction';
import { groupReactionsByEmoji } from '@/comment/utils/reactionUtils';
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchUser } from '@/user/external/user.api';

// 공통 파라미터 타입
interface BaseEntityParams {
  type: 'comment' | 'reply';
  boardId: string;
  postId: string;
  commentId: string;
}

// 댓글 파라미터 타입
export interface CommentParams extends BaseEntityParams {
  type: 'comment';
}

// 답글 파라미터 타입
export interface ReplyParams extends BaseEntityParams {
  type: 'reply';
  replyId: string;
}

// 훅 반환 타입
interface UseReactionsReturn {
  reactions: GroupedReaction[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  createReaction: (emoji: string) => Promise<void>;
  deleteReaction: (emoji: string, userId: string) => Promise<void>;
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
  });

  const mutations = useReactionMutations(entity, queryKey);
  return { reactions, isLoading, isError, error: error as Error | null, ...mutations };
}

function commentReactionsKeyPrefix(boardId: string, postId: string): QueryKey {
  return ['commentReactions', boardId, postId];
}

function useReactionMutations(
  entity: CommentParams | ReplyParams,
  invalidateKey: QueryKey,
): Pick<UseReactionsReturn, 'createReaction' | 'deleteReaction'> {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { boardId, postId, commentId } = entity;
  const entityParams: GetReactionsParams =
    entity.type === 'reply' ? { boardId, postId, commentId, replyId: entity.replyId } : { boardId, postId, commentId };

  const createReactionMutation = useMutation(
    async (emoji: string) => {
      if (!currentUser) throw new Error('로그인이 필요합니다.');
      const userData = await fetchUser(currentUser.uid);
      const reactionUser: ReactionUser = {
        userId: currentUser.uid,
        userName: userData?.nickname || userData?.realName || currentUser.displayName || '익명 사용자',
        userProfileImage: userData?.profilePhotoURL || currentUser.photoURL || ''
      };
      await createReaction({ ...entityParams, content: emoji, reactionUser });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: invalidateKey });
      },
    }
  );

  const deleteReactionMutation = useMutation(
    async ({ emoji, userId }: { emoji: string; userId: string }) => {
      if (!currentUser || currentUser.uid !== userId) throw new Error('자신의 반응만 삭제할 수 있습니다.');
      await deleteUserReaction(entityParams, userId, emoji);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: invalidateKey });
      },
    }
  );

  return {
    createReaction: (emoji: string) => createReactionMutation.mutateAsync(emoji),
    deleteReaction: (emoji: string, userId: string) => deleteReactionMutation.mutateAsync({ emoji, userId })
  };
}
