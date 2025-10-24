export type RecoveryStatus = 'none' | 'eligible' | 'partial' | 'success';

export interface User {
    uid: string; // Unique identifier for the user
    realName: string | null;
    nickname: string | null;
    email: string | null;
    profilePhotoURL: string | null;
    bio: string | null;
    boardPermissions: {
      [boardId: string]: 'read' | 'write'; // Permissions for each board
    };
    recoveryStatus?: RecoveryStatus;
    profile?: {
      timezone?: string; // IANA timezone identifier (e.g., 'Asia/Seoul')
    };
  }