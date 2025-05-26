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
   * 나를 차단한 유저의 uid 배열 (Access Control)
   * 이 배열에 내가 포함되어 있으면, 해당 유저의 모든 콘텐츠를 볼 수 없음
   */
  blockedBy?: string[];
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
  // blockedBy는 optional로 유지
  blockedBy?: string[];
};