// src/types/User.ts
import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string; // Unique identifier for the user
  realName: string | null;
  nickname: string | null;
  email: string | null;
  profilePhotoURL: string | null;
  bio: string | null;
  phoneNumber: string | null;
  referrer: string | null;
  boardPermissions: {
    [boardId: string]: 'read' | 'write'; // Permissions for each board
  };
  updatedAt: Timestamp | null; // 마지막 업데이트 시각 (Firestore Timestamp)
  knownBuddy?: {
    uid: string;
    nickname: string | null;
    profilePhotoURL: string | null;
  };
  /**
   * 차단한 유저의 uid 배열 (Access Control)
   * 이 배열에 포함된 유저는 내 모든 콘텐츠를 볼 수 없음
   */
  blockedUsers?: string[];
}

export type UserRequiredFields = {
  uid: string;
  realName: string | null;
  nickname: string | null;
  profilePhotoURL: string | null;
  email: string | null;
};

export type UserOptionalFields = {
  bio: string | null;
  phoneNumber: string | null;
  referrer: string | null;
  boardPermissions: {
    [boardId: string]: 'read' | 'write'; // Permissions for each board
  };
  updatedAt: Timestamp | null; // 마지막 업데이트 시각 (Firestore Timestamp)
  knownBuddy?: {
    uid: string;
    nickname: string | null;
    profilePhotoURL: string | null;
  };
};