import * as Sentry from '@sentry/react';

import {
  getSupabaseClient,
  isNetworkError,
  SupabaseNetworkError,
} from '@/shared/external/supabaseClient';
import type { Database } from '@/shared/external/database.types';
import type { User } from '@/user/model/User';

import { type BoardPermission, mapToUser, parseBoardPermission } from './user.mapper';

const USER_SELECT =
  'id, real_name, nickname, email, profile_photo_url, bio, phone_number, kakao_id, referrer, onboarding_complete, timezone';

/** Fetch a single user by ID. Returns null when the row does not exist. */
export async function fetchUserFromSupabase(uid: string): Promise<User | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select(`${USER_SELECT}, known_buddy_uid`)
    .eq('id', uid)
    .single();

  if (error) {
    if (isNetworkError(error)) throw new SupabaseNetworkError(error);
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  if (!data) return null;

  const { data: permData, error: permError } = await supabase
    .from('user_board_permissions')
    .select('board_id, permission')
    .eq('user_id', uid);
  if (permError) {
    if (isNetworkError(permError)) throw new SupabaseNetworkError(permError);
    throw permError;
  }

  const boardPermissions: Record<string, BoardPermission> = {};
  for (const p of permData ?? []) {
    boardPermissions[p.board_id] = parseBoardPermission(p.permission);
  }

  // knownBuddy is optional display context: degrade-open (report + continue).
  let knownBuddy: User['knownBuddy'] = undefined;
  if (data.known_buddy_uid) {
    const { data: buddyData, error: buddyError } = await supabase
      .from('users')
      .select('id, nickname, profile_photo_url')
      .eq('id', data.known_buddy_uid)
      .single();
    if (buddyError) {
      Sentry.captureException(buddyError);
    } else if (buddyData) {
      knownBuddy = {
        uid: buddyData.id,
        nickname: buddyData.nickname,
        profilePhotoURL: buddyData.profile_photo_url,
      };
    }
  }

  return mapToUser(data, { boardPermissions, knownBuddy });
}

/** Fetch all users (admin/search). */
export async function fetchAllUsersFromSupabase(): Promise<User[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from('users').select(USER_SELECT);

  if (error) throw error;

  return (data ?? []).map((row) => mapToUser(row));
}

/**
 * Fetch users with write permission on given boards.
 * Uses index: idx_permissions_board
 */
export async function fetchUsersWithBoardPermissionFromSupabase(
  boardIds: string[],
): Promise<User[]> {
  if (boardIds.length === 0) return [];

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_board_permissions')
    .select(`user_id, board_id, permission, users!inner (${USER_SELECT})`)
    .in('board_id', boardIds)
    .eq('permission', 'write');

  if (error) throw error;

  // A user may hold write permission on several boards; dedup and accumulate.
  const userMap = new Map<string, User>();
  for (const row of data ?? []) {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    let user = userMap.get(u.id);
    if (!user) {
      user = mapToUser(u);
      userMap.set(u.id, user);
    }
    user.boardPermissions[row.board_id] = parseBoardPermission(row.permission);
  }

  return Array.from(userMap.values());
}

// --- Batch Queries (shared by stats + board pages) ---

/** Minimal user row for list/batch contexts. Derived from the generated schema. */
export type BasicUserRow = Pick<
  Database['public']['Tables']['users']['Row'],
  'id' | 'real_name' | 'nickname' | 'profile_photo_url'
>;

export async function fetchBatchUsersBasic(userIds: string[]): Promise<BasicUserRow[]> {
  if (userIds.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname, profile_photo_url')
    .in('id', userIds);
  if (error) throw error;
  return data ?? [];
}
