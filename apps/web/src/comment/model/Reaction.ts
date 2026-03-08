import type { UserSummary } from '@/shared/model/UserSummary';

export type ReactionUser = UserSummary;

/**
 * 반응(Reaction) 데이터 모델 인터페이스
 * 댓글이나 답글에 대한 이모지 반응을 나타냅니다.
 */
export interface Reaction {
  id: string;
  content: string;
  createdAt: Date;
  reactionUser: UserSummary;
}

export interface GroupedReaction {
  content: string;
  by: UserSummary[];
}
