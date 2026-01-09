import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  getReactions,
  createReaction,
  deleteUserReaction,
  GetReactionsParams
} from '@/comment/api/reaction';
import { GroupedReaction, ReactionUser } from '@/comment/model/Reaction';
import { groupReactionsByEmoji } from '@/comment/utils/reactionUtils';
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchUser } from '@/user/api/user';

// 엔티티 타입 정의
export type EntityType = 'comment' | 'reply';

// 공통 파라미터 타입
interface BaseEntityParams {
  type: EntityType;
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

// 훅 프롭스 타입
interface UseReactionsProps {
  entity: CommentParams | ReplyParams;
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

export function useReactions({ entity }: UseReactionsProps): UseReactionsReturn {
  const { currentUser } = useAuth();
  const { boardId, postId } = useParams<{ boardId: string; postId: string }>();
  const queryClient = useQueryClient();

  // 엔티티 파라미터 생성
  const getEntityParams = (): GetReactionsParams => {
    if (!boardId || !postId) throw new Error('게시판 ID 또는 게시글 ID가 없습니다.');
    const base = { boardId, postId, commentId: entity.commentId };
    return entity.type === 'reply' ? { ...base, replyId: (entity as ReplyParams).replyId } : base;
  };

  // 쿼리 키
  const reactionsQueryKey = [
    'reactions',
    boardId,
    postId,
    entity.commentId,
    entity.type === 'reply' ? (entity as ReplyParams).replyId : undefined
  ];

  // 쿼리
  const { data: reactions = [], isLoading, isError, error } = useQuery({
    queryKey: reactionsQueryKey,
    queryFn: async () => {
      const params = getEntityParams();
      const list = await getReactions(params);
      return groupReactionsByEmoji(list);
    },
    suspense: true,
  });

  // 리액션 생성
  const createReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      if (!currentUser) throw new Error('로그인이 필요합니다.');
      const userData = await fetchUser(currentUser.uid);
      const reactionUser: ReactionUser = {
        userId: currentUser.uid,
        userName: userData?.nickname || userData?.realName || currentUser.displayName || '익명 사용자',
        userProfileImage: userData?.profilePhotoURL || currentUser.photoURL || ''
      };
      await createReaction({ ...getEntityParams(), content: emoji, reactionUser });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reactionsQueryKey });
    },
  });

  // 리액션 삭제
  const deleteReactionMutation = useMutation({
    mutationFn: async ({ emoji, userId }: { emoji: string; userId: string }) => {
      if (!currentUser || currentUser.uid !== userId) throw new Error('자신의 반응만 삭제할 수 있습니다.');
      await deleteUserReaction(getEntityParams(), userId, emoji);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reactionsQueryKey });
    },
  });

  return {
    reactions,
    isLoading,
    isError,
    error: error as Error | null,
    createReaction: (emoji: string) => createReactionMutation.mutateAsync(emoji),
    deleteReaction: (emoji: string, userId: string) => deleteReactionMutation.mutateAsync({ emoji, userId })
  };
} 