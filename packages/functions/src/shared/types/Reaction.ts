import { Timestamp } from 'firebase-admin/firestore';

export interface Reaction {
  id: string;
  content: string; // 이모지
  createdAt: Timestamp; // 생성 시간
  reactionUser: ReactionUser;
}

export interface ReactionUser {
  userId: string;
  userName: string;
  userProfileImage: string;
}
