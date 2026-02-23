import type { User } from '@/user/model/User';

/**
 * 사용자의 표시명을 가져옵니다.
 * nickname이 있으면 nickname을, 없으면 realName을 사용합니다.
 * 둘 다 없으면 '??'를 반환합니다.
 */
export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return '??';

  // nickname이 존재하고 빈 문자열이 아닌 경우 nickname 사용
  if (user.nickname && user.nickname.trim() !== '') {
    return user.nickname;
  }

  // nickname이 없거나 빈 문자열인 경우 realName 사용
  return user.realName || '??';
}
