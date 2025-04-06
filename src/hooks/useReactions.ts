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

interface UseReactionsProps {
  entity: CommentParams | ReplyParams;
}

export interface CommentParams {
  type: 'comment';
  boardId: string;
  postId: string;
  commentId: string;
}

export interface ReplyParams {
  type: 'reply';
  boardId: string;
  postId: string;
  commentId: string;
  replyId: string;
}

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

  // 엔티티 ID 구성
  const getEntityParams = (): GetReactionsParams => {
    if (!boardId || !postId) {
      throw new Error('게시판 ID 또는 게시글 ID가 없습니다.');
    }

    if (entity.type === 'comment') {
      return {
        boardId,
        postId,
        commentId: entity.commentId
      };
    } 
    
    if (entity.type === 'reply') {
      return {
        boardId,
        postId,
        commentId: entity.commentId,
        replyId: entity.replyId
      };
    }

    throw new Error('유효하지 않은 엔티티 유형입니다.');
  };

  // 쿼리 키 생성
  const getReactionsQueryKey = () => {
    const params = getEntityParams();
    return ['reactions', params.boardId, params.postId, params.commentId, params.replyId];
  };

  // 반응 데이터 조회 (useQuery 사용)
  const {
    data: reactions = [],
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: getReactionsQueryKey(),
    queryFn: async () => {
      const params = getEntityParams();
      const reactionsList = await getReactions(params);
      return groupReactionsByEmoji(reactionsList);
    },
    staleTime: 1000 * 60, // 1분 동안 데이터를 신선한 상태로 유지
    retry: 1, // 실패 시 1번 재시도
  });

  // 반응 생성 뮤테이션 (useMutation 사용)
  const createReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      if (!currentUser) {
        throw new Error('로그인이 필요합니다.');
      }

      const reactionUser: ReactionUser = {
        userId: currentUser.uid,
        userName: currentUser.displayName || '익명 사용자',
        userProfileImage: currentUser.photoURL || ''
      }

      const params = {
        ...getEntityParams(),
        content: emoji,
        reactionUser: reactionUser
      };

      await createReactionApi(params);
    },
    onSuccess: () => {
      // 성공 시 반응 목록 쿼리 무효화하여 데이터 다시 가져오기
      queryClient.invalidateQueries({ queryKey: getReactionsQueryKey() });
    },
    onError: (error) => {
      console.error('반응 생성 중 오류 발생:', error);
    }
  });

  // 반응 삭제 뮤테이션 (useMutation 사용)
  const deleteReactionMutation = useMutation({
    mutationFn: async ({ emoji, userId }: { emoji: string; userId: string }) => {
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('자신의 반응만 삭제할 수 있습니다.');
      }

      const params = getEntityParams();
      await deleteUserReaction(params, userId, emoji);
    },
    onSuccess: () => {
      // 성공 시 반응 목록 쿼리 무효화하여 데이터 다시 가져오기
      queryClient.invalidateQueries({ queryKey: getReactionsQueryKey() });
    },
    onError: (error) => {
      console.error('반응 삭제 중 오류 발생:', error);
    }
  });

  // 반응 생성 핸들러
  const handleCreateReaction = async (emoji: string): Promise<void> => {
    await createReactionMutation.mutateAsync(emoji);
  };

  // 반응 삭제 핸들러
  const handleDeleteReaction = async (emoji: string, userId: string): Promise<void> => {
    await deleteReactionMutation.mutateAsync({ emoji, userId });
  };

  return {
    reactions,
    isLoading,
    isError,
    error: error as Error | null,
    createReaction: handleCreateReaction,
    deleteReaction: handleDeleteReaction
  };
}; 