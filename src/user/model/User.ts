// src/types/User.ts
import { Timestamp } from 'firebase/firestore';

export type RecoveryStatus = 'none' | 'eligible' | 'partial' | 'success';

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
  /**
   * 스트릭 복구 상태
   * - 'none': 복구 대상/기간 아님
   * - 'eligible': 복구 기회 있음 (2개 글 작성 필요)
   * - 'partial': 1개만 작성됨 (1개 더 필요)
   * - 'success': 복구 성공 (2개 작성 완료)
   */
  recoveryStatus?: RecoveryStatus;
  profile?: {
    timezone?: string; // IANA timezone identifier (e.g., 'Asia/Seoul')
  };
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
  recoveryStatus?: RecoveryStatus;
  profile?: {
    timezone?: string;
  };
};