import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import type { BasicUserRow } from '@/user/api/userReads';

/**
 * Lightweight subset of {@link User} used by surfaces that only need to render
 * an avatar + display name (notifications, mentions, etc.). Distinct from the
 * full `['user', uid]` cache so bulk-prefetch and full-profile reads don't
 * clobber each other's cache shape.
 */
export interface UserBasic {
  uid: string;
  nickname: string | null;
  realName: string | null;
  profilePhotoURL: string | null;
}

export function userBasicQueryKey(uid: string | null | undefined) {
  return ['userBasic', uid] as const;
}

export function mapBasicRowToUserBasic(row: BasicUserRow): UserBasic {
  return {
    uid: row.id,
    nickname: row.nickname,
    realName: row.real_name,
    profilePhotoURL: row.profile_photo_url,
  };
}

async function fetchUserBasic(uid: string): Promise<UserBasic | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname, profile_photo_url')
    .eq('id', uid)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? mapBasicRowToUserBasic(data as BasicUserRow) : null;
}

export function useUserBasic(uid: string | null | undefined) {
  return useQuery<UserBasic | null>(
    userBasicQueryKey(uid),
    () => fetchUserBasic(uid as string),
    {
      enabled: !!uid,
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );
}
