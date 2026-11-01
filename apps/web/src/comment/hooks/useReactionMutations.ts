import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { type GetReactionsParams, createReaction, deleteUserReaction } from '@/comment/external/reaction.api';
import type { ReactionEntity, ReactionUser } from '@/comment/model/Reaction';
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchUser } from '@/user/external/user.api';

export interface ReactionMutations {
  createReaction: (emoji: string) => Promise<void>;
  deleteReaction: (emoji: string, userId: string) => Promise<void>;
}

export function useReactionMutations(
  entity: ReactionEntity,
  invalidateKey: QueryKey,
): ReactionMutations {
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
