import { Timestamp } from 'firebase/firestore';
import { User } from '@/user/model/User';

// localStorage에서 User 데이터 읽기
export function getCachedUserData(uid: string): User | null {
  const cached = localStorage.getItem(`user-${uid}`);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    if (parsed && parsed.data && parsed.updatedAt) {
      return {
        ...parsed.data,
        updatedAt: parsed.updatedAt ? Timestamp.fromDate(new Date(parsed.updatedAt)) : null,
      };
    }
    // 구버전 캐시 호환
    return parsed as User;
  } catch {
    return null;
  }
}

// localStorage에 User 데이터 저장
export function cacheUserData(uid: string, data: User): void {
  localStorage.setItem(
    `user-${uid}`,
    JSON.stringify({
      data: { ...data, updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null },
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    })
  );
}

// localStorage에서 User 데이터 삭제
export function removeCachedUserData(uid: string): void {
  localStorage.removeItem(`user-${uid}`);
} 