// This file is for the ALL API that related to 'User' domain model.
// Use a consistent naming convention; fetchX() → read-only function, createX(), updateX() → write, cacheX() → caching helpers (if used outside)
// Abstract repetitive Firebase logic into helpers

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase';
import { getSupabaseClient, throwOnError } from '@/shared/api/supabaseClient';
import { fetchUserFromSupabase, fetchAllUsersFromSupabase, fetchUsersWithBoardPermissionFromSupabase } from '@/shared/api/supabaseReads';
import type { User, UserOptionalFields, UserRequiredFields } from '@/user/model/User';
import type { User as FirebaseUser } from 'firebase/auth';
import { mapUserToSupabaseUpdate, mapBoardPermissionsToRows } from '@/user/utils/userMappers';

// Supabase에서 User 데이터 읽기
export async function fetchUser(uid: string): Promise<User | null> {
    return fetchUserFromSupabase(uid);
}

// Supabase에 User 데이터 생성
export async function createUser(data: User): Promise<void> {
    const supabase = getSupabaseClient();
    throwOnError(await supabase.from('users').insert({
        id: data.uid,
        real_name: data.realName || null,
        nickname: data.nickname || null,
        email: data.email || null,
        profile_photo_url: data.profilePhotoURL || null,
        bio: data.bio || null,
        phone_number: data.phoneNumber || null,
        referrer: data.referrer || null,
    }));

    // Sync boardPermissions to user_board_permissions table
    if (data.boardPermissions) {
        const permRows = mapBoardPermissionsToRows(data.uid, data.boardPermissions);
        if (permRows.length > 0) {
            throwOnError(await supabase.from('user_board_permissions').upsert(permRows, { onConflict: 'user_id,board_id' }));
        }
    }
}

// Supabase의 User 데이터 수정
export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
    const supabase = getSupabaseClient();
    const updateData = mapUserToSupabaseUpdate(data);
    if (Object.keys(updateData).length > 0) {
        throwOnError(await supabase.from('users').update(updateData).eq('id', uid));
    }

    // Sync boardPermissions
    if (data.boardPermissions !== undefined) {
        throwOnError(await supabase.from('user_board_permissions').delete().eq('user_id', uid));
        const permRows = mapBoardPermissionsToRows(uid, data.boardPermissions);
        if (permRows.length > 0) {
            throwOnError(await supabase.from('user_board_permissions').insert(permRows));
        }
    }
}

// Supabase의 User 데이터 삭제
export async function deleteUser(uid: string): Promise<void> {
    const supabase = getSupabaseClient();
    throwOnError(await supabase.from('users').delete().eq('id', uid));
}

// 특정 boardIds에 write 권한이 있는 모든 사용자 데이터 가져오기
export async function fetchUsersWithBoardPermission(boardIds: string[]): Promise<User[]> {
    try {
        if (boardIds.length === 0) return [];
        return await fetchUsersWithBoardPermissionFromSupabase(boardIds);
    } catch (error) {
        console.error('Error fetching users with board permission:', error);
        return [];
    }
}

// 프로필 사진 업로드 및 URL 반환
export async function uploadUserProfilePhoto(userId: string, file: File): Promise<string> {
    const storageRef = ref(storage, `profilePhotos/${userId}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}


/**
 * Supabase에 User가 없으면 생성하는 함수입니다.
 * 이미 존재하는 경우 아무 작업도 수행하지 않습니다.
 * 이 함수는 Auth에서 로그인된 유저(FirebaseUser)가 Users 테이블에도 존재해야 할 때 사용됩니다.
 *
 * @param {FirebaseUser} user - Firebase 인증을 통해 로그인된 사용자 객체입니다.
 * @returns {Promise<void>} - 작업이 완료되면 반환되는 프로미스입니다.
 */
export async function createUserIfNotExists(user: FirebaseUser): Promise<void> {
    const existing = await fetchUser(user.uid);
    if (!existing) {

        const requiredFields: UserRequiredFields = {
            uid: user.uid,
            realName: user.displayName,
            nickname: user.displayName,
            email: user.email,
            profilePhotoURL: user.photoURL,
        }

        const defaultUserFields: UserOptionalFields = {
            bio: null,
            phoneNumber: null,
            referrer: null,
            boardPermissions: {
                'rW3Y3E2aEbpB0KqGiigd': 'read', // 기본 보드 ID
            },
            updatedAt: null,
        }
        await createUser({
            ...requiredFields,
            ...defaultUserFields,
        });
    }
}

/**
 * 모든 유저를 반환합니다 (관리자/검색용)
 * @returns User[]
 */
export async function fetchAllUsers(): Promise<User[]> {
    try {
        return await fetchAllUsersFromSupabase();
    } catch (error) {
        console.error('Error fetching all users:', error);
        return [];
    }
}

/** 차단 */
export async function blockUser(blockerId: string, blockedId: string) {
  const supabase = getSupabaseClient();
  throwOnError(await supabase.from('blocks').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  }));
}

/** 차단 해제 */
export async function unblockUser(blockerId: string, blockedId: string) {
  const supabase = getSupabaseClient();
  throwOnError(await supabase.from('blocks').delete().match({
    blocker_id: blockerId,
    blocked_id: blockedId,
  }));
}

/** 내가 차단한 유저 목록 */
export async function getBlockedUsers(userId: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);
  if (error) {
    console.error('Error fetching blocked users:', error);
    return [];
  }
  return (data || []).map(row => row.blocked_id);
}

/** 나를 차단한 유저 목록 */
export async function getBlockedByUsers(userId: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocked_id', userId);
  if (error) {
    console.error('Error fetching blocked-by users:', error);
    return [];
  }
  return (data || []).map(row => row.blocker_id);
}
