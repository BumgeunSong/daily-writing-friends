import type { User } from '@/user/model/User';

/**
 * Partial<User>의 camelCase 필드를 Supabase users 테이블의 snake_case 컬럼으로 변환
 */
export function mapUserToSupabaseUpdate(data: Partial<User>): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  if (data.realName !== undefined) updateData.real_name = data.realName;
  if (data.nickname !== undefined) updateData.nickname = data.nickname;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.profilePhotoURL !== undefined) updateData.profile_photo_url = data.profilePhotoURL;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
  if (data.referrer !== undefined) updateData.referrer = data.referrer;
  return updateData;
}

/**
 * boardPermissions 객체를 Supabase user_board_permissions 행 배열로 변환
 */
export function mapBoardPermissionsToRows(
  userId: string,
  permissions: Record<string, 'read' | 'write'>,
): { user_id: string; board_id: string; permission: string }[] {
  return Object.entries(permissions).map(([boardId, permission]) => ({
    user_id: userId,
    board_id: boardId,
    permission,
  }));
}
