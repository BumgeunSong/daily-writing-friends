import { getSupabaseClient, isNetworkError, SupabaseNetworkError } from '@/shared/api/supabaseClient';
import type { User } from '@/user/model/User';

// --- Users ---

interface UserJoinRow {
  id: string;
  real_name: string | null;
  nickname: string | null;
  email: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  phone_number: string | null;
  kakao_id: string | null;
  referrer: string | null;
  onboarding_complete: boolean;
  timezone: string | null;
}

/** Row from: user_board_permissions + users!inner join */
interface UserPermissionWithJoins {
  user_id: string;
  board_id: string;
  permission: string;
  users: UserJoinRow | UserJoinRow[];
}

/**
 * Fetch a single user by ID.
 * Replaces: fetchUser in user.ts
 */
export async function fetchUserFromSupabase(uid: string): Promise<User | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname, email, profile_photo_url, bio, phone_number, kakao_id, referrer, onboarding_complete, timezone, known_buddy_uid')
    .eq('id', uid)
    .single();

  if (error) {
    if (isNetworkError(error)) {
      throw new SupabaseNetworkError(error);
    }
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Supabase fetchUser error:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  // Fetch board permissions
  const { data: permData, error: permError } = await supabase
    .from('user_board_permissions')
    .select('board_id, permission')
    .eq('user_id', uid);

  if (permError) {
    if (isNetworkError(permError)) {
      throw new SupabaseNetworkError(permError);
    }
    console.error('Supabase fetchUser board permissions error:', permError);
    throw permError;
  }

  const boardPermissions: Record<string, 'read' | 'write'> = {};
  for (const p of permData || []) {
    boardPermissions[p.board_id] = p.permission as 'read' | 'write';
  }

  // Fetch known buddy info if exists (optional — log and continue on failure)
  let knownBuddy: User['knownBuddy'] = undefined;
  if (data.known_buddy_uid) {
    const { data: buddyData, error: buddyError } = await supabase
      .from('users')
      .select('id, nickname, profile_photo_url')
      .eq('id', data.known_buddy_uid)
      .single();
    if (buddyError) {
      console.error('Supabase fetchUser knownBuddy error:', buddyError);
    } else if (buddyData) {
      knownBuddy = {
        uid: buddyData.id,
        nickname: buddyData.nickname,
        profilePhotoURL: buddyData.profile_photo_url,
      };
    }
  }

  return {
    uid: data.id,
    realName: data.real_name,
    nickname: data.nickname,
    email: data.email,
    profilePhotoURL: data.profile_photo_url,
    bio: data.bio,
    phoneNumber: data.phone_number,
    kakaoId: data.kakao_id,
    referrer: data.referrer,
    onboardingComplete: data.onboarding_complete ?? false,
    boardPermissions,
    updatedAt: null,
    knownBuddy,
    profile: data.timezone ? { timezone: data.timezone } : undefined,
  };
}

/**
 * Fetch all users.
 * Replaces: fetchAllUsers in user.ts
 */
export async function fetchAllUsersFromSupabase(): Promise<User[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname, email, profile_photo_url, bio, phone_number, kakao_id, referrer, onboarding_complete, timezone');

  if (error) {
    console.error('Supabase fetchAllUsers error:', error);
    return [];
  }

  return (data || []).map((row) => ({
    uid: row.id,
    realName: row.real_name,
    nickname: row.nickname,
    email: row.email,
    profilePhotoURL: row.profile_photo_url,
    bio: row.bio,
    phoneNumber: row.phone_number,
    kakaoId: row.kakao_id,
    referrer: row.referrer,
    onboardingComplete: row.onboarding_complete ?? false,
    boardPermissions: {},
    updatedAt: null,
  }));
}

/**
 * Fetch users with write permission on given boards.
 * Replaces: fetchUsersWithBoardPermission in user.ts
 * Uses index: idx_permissions_board
 */
export async function fetchUsersWithBoardPermissionFromSupabase(
  boardIds: string[]
): Promise<User[]> {
  if (boardIds.length === 0) return [];

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_board_permissions')
    .select(`
      user_id,
      board_id,
      permission,
      users!inner (
        id,
        real_name,
        nickname,
        email,
        profile_photo_url,
        bio,
        phone_number,
        kakao_id,
        referrer,
        onboarding_complete,
        timezone
      )
    `)
    .in('board_id', boardIds)
    .eq('permission', 'write');

  if (error) {
    console.error('Supabase fetchUsersWithBoardPermission error:', error);
    return [];
  }

  // Deduplicate users (a user may have permissions on multiple boards)
  const userMap = new Map<string, User>();
  for (const row of (data || []) as UserPermissionWithJoins[]) {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    if (!userMap.has(u.id)) {
      userMap.set(u.id, {
        uid: u.id,
        realName: u.real_name,
        nickname: u.nickname,
        email: u.email,
        profilePhotoURL: u.profile_photo_url,
        bio: u.bio,
        phoneNumber: u.phone_number,
        kakaoId: u.kakao_id,
        referrer: u.referrer,
        onboardingComplete: u.onboarding_complete ?? false,
        boardPermissions: {},
        updatedAt: null,
        profile: u.timezone ? { timezone: u.timezone } : undefined,
      });
    }
    const user = userMap.get(u.id)!;
    user.boardPermissions[row.board_id] = row.permission as 'read' | 'write';
  }

  return Array.from(userMap.values());
}

// --- Batch Queries (shared by stats + board pages) ---

export interface BasicUserRow {
  id: string;
  real_name: string | null;
  nickname: string | null;
  profile_photo_url: string | null;
}

export async function fetchBatchUsersBasic(userIds: string[]): Promise<BasicUserRow[]> {
  if (userIds.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname, profile_photo_url')
    .in('id', userIds);
  if (error) {
    console.error('Supabase batch users fetch error:', { userCount: userIds.length, error });
    throw error;
  }
  return (data || []) as BasicUserRow[];
}
