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
}
