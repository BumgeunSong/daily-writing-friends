import { Timestamp } from 'firebase/firestore';
import type { User } from '@/user/model/User';

const CACHE_EXPIRE_MS = 1000 * 60 * 60 * 24; // 24시간

function isValidUserData(data: unknown): data is User {
  if (!data || typeof data !== 'object') return false;
  const userData = data as Record<string, unknown>;
  return (
    typeof userData.uid === 'string' &&
    typeof userData.nickname === 'string' &&
    typeof userData.profilePhotoURL === 'string' &&
    userData.updatedAt !== undefined
  );
}

// localStorage에서 User 데이터 읽기
export function getCachedUserData(uid: string, cacheVersion: string): User | null {
  const cached = localStorage.getItem(`${cacheVersion}-user-${uid}`);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    if (!parsed || !parsed.data || !parsed.updatedAt) return null;
    const now = Date.now();
    const cachedAt = new Date(parsed.updatedAt).getTime();
    if (now - cachedAt > CACHE_EXPIRE_MS) {
      removeCachedUserData(uid, cacheVersion);
      return null;
    }
    if (!isValidUserData(parsed.data)) {
      removeCachedUserData(uid, cacheVersion);
      return null;
    }
    return {
      ...parsed.data,
      updatedAt: parsed.updatedAt ? Timestamp.fromDate(new Date(parsed.updatedAt)) : null,
    };
  } catch {
    removeCachedUserData(uid, cacheVersion);
    return null;
  }
}

// localStorage에 User 데이터 저장
export function cacheUserData(uid: string, data: User, cacheVersion: string): void {
  if (!isValidUserData(data)) return;
  localStorage.setItem(
    `${cacheVersion}-user-${uid}`,
    JSON.stringify({
      data: { ...data, updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null },
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    })
  );
}

// localStorage에서 User 데이터 삭제
export function removeCachedUserData(uid: string, cacheVersion: string): void {
  localStorage.removeItem(`${cacheVersion}-user-${uid}`);
} 