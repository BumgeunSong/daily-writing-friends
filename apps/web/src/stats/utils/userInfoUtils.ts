import type { User } from '@/user/model/User';

/**
 * Creates a standardized user info object from User model
 * Pure function - no Firebase dependencies
 */
export function createUserInfo(user: User) {
  return {
    id: user.uid,
    nickname: user.nickname || null,
    realname: user.realName || null,
    profilePhotoURL: user.profilePhotoURL || null,
    bio: user.bio || null,
  };
}
