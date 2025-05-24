import { useAuth } from '@/shared/hooks/useAuth';
import { useUser } from './useUser';

/**
 * 현재 로그인한 사용자의 knownBuddy 정보를 반환하는 커스텀 훅
 * - knownBuddy가 없으면 null 반환
 * - { knownBuddy, isLoading, error } 형태로 반환
 */
export function useCurrentUserKnownBuddy() {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const { userData, isLoading, error } = useUser(userId);

  return {
    knownBuddy: userData?.knownBuddy ?? null,
    isLoading,
    error,
  };
} 