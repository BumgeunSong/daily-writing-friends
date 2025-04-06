import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getReactions,
  createReaction as createReactionApi,
  deleteUserReaction,
  groupReactionsByEmoji,
  GetReactionsParams
} from '@/utils/reactionUtils';
import { GroupedReaction, ReactionUser } from '@/types/Reaction';
import { useParams } from 'react-router-dom';
import { fetchUserData } from '@/utils/userUtils';

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

export const useReactions = ({ entity }: UseReactionsProps): UseReactionsReturn => {
  const { currentUser } = useAuth();
  const { boardId, postId } = useParams<{ boardId: string; postId: string }>();
  const queryClient = useQueryClient();

  // 엔티티 파라미터 구성
  const getEntityParams = (): GetReactionsParams => {
    if (!boardId || !postId) {
      throw new Error('게시판 ID 또는 게시글 ID가 없습니다.');
    }

    const baseParams = {
      boardId,
      postId,
      commentId: entity.commentId
    };

    return entity.type === 'reply' 
      ? { ...baseParams, replyId: entity.replyId } 
      : baseParams;
  };

  // 쿼리 키 생성
  const reactionsQueryKey = (() => {
    const params = getEntityParams();
    return ['reactions', params.boardId, params.postId, params.commentId, 
            entity.type === 'reply' ? (entity as ReplyParams).replyId : undefined];
  })();

  // 반응 데이터 조회
  const {
    data: reactions = [],
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: reactionsQueryKey,
    queryFn: async () => {
      const params = getEntityParams();
      const reactionsList = await getReactions(params);
      return groupReactionsByEmoji(reactionsList);
    },
    staleTime: 1000 * 60, // 1분 동안 데이터를 신선한 상태로 유지
    retry: 1, // 실패 시 1번 재시도
  });

  // 사용자 반응 객체 생성 함수
  const createReactionUserObject = async (): Promise<ReactionUser> => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    const userData = await fetchUserData(currentUser.uid);
    
    return {
      userId: currentUser.uid,
      userName: userData?.nickname || userData?.realName || currentUser.displayName || '익명 사용자',
      userProfileImage: userData?.profilePhotoURL || currentUser.photoURL || ''
    };
  };

  // 반응 생성 뮤테이션
  const createReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const reactionUser = await createReactionUserObject();
      const params = {
        ...getEntityParams(),
        content: emoji,
        reactionUser
      };

      await createReactionApi(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reactionsQueryKey });
    },
    onError: (error) => {
      console.error('반응 생성 중 오류 발생:', error);
    }
  });

  // 반응 삭제 뮤테이션
  const deleteReactionMutation = useMutation({
    mutationFn: async ({ emoji, userId }: { emoji: string; userId: string }) => {
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('자신의 반응만 삭제할 수 있습니다.');
      }

      await deleteUserReaction(getEntityParams(), userId, emoji);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reactionsQueryKey });
    },
    onError: (error) => {
      console.error('반응 삭제 중 오류 발생:', error);
    }
  });

  return {
    reactions,
    isLoading,
    isError,
    error: error as Error | null,
    createReaction: (emoji) => createReactionMutation.mutateAsync(emoji),
    deleteReaction: (emoji, userId) => deleteReactionMutation.mutateAsync({ emoji, userId })
  };
}; 