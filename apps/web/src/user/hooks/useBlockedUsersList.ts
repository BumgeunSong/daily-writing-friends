import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AuthUser } from '@/shared/hooks/useAuth';
import { blockUser, fetchUser, getBlockedUsers, unblockUser } from '@/user/api/user';
import type { User } from '@/user/model/User';
import { mapBlockedUsersFromSettled, MAX_BLOCKED_USERS } from '@/user/utils/blockedUsersUtils';

const TOAST_OPTIONS = { position: 'bottom-center' } as const;

export type BlockOutcome =
  | { kind: 'success' }
  | { kind: 'limit-exceeded' }
  | { kind: 'failure' };

export type UnblockOutcome = { kind: 'success' } | { kind: 'failure' };

export interface UseBlockedUsersListResult {
  blockedUsers: User[];
  loading: boolean;
  isAtLimit: boolean;
  block: (user: User) => Promise<BlockOutcome>;
  unblock: (uid: string) => Promise<UnblockOutcome>;
}

/**
 * Owns the blocked-users data layer for `BlockedUsersPage`:
 * - Initial load: fetches the uid list, then resolves each user in parallel.
 *   Partial failures show a warning toast; total failure shows an error toast
 *   and leaves the previous state alone.
 * - `block` / `unblock`: optimistic-ish mutation that updates local state on
 *   success and surfaces failure via toast so callers only need to react to
 *   the outcome kind (close dialog / clear search / show limit dialog).
 */
export function useBlockedUsersList(currentUser: AuthUser | null): UseBlockedUsersListResult {
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    void (async () => {
      const blockedUids = await getBlockedUsers(currentUser.uid);
      if (cancelled) return;
      if (!blockedUids || blockedUids.length === 0) {
        setBlockedUsers([]);
        return;
      }
      const results = await Promise.allSettled(blockedUids.map((uid) => fetchUser(uid)));
      if (cancelled) return;
      const { users, rejectedCount, totalCount } = mapBlockedUsersFromSettled(results);
      const allFailed = users.length === 0 && rejectedCount === totalCount;
      if (allFailed) {
        toast.error('차단된 사용자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      if (rejectedCount > 0) {
        toast.warning(`차단된 사용자 ${rejectedCount}명의 정보를 불러오지 못했습니다.`);
      }
      setBlockedUsers(users);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const block = useCallback(
    async (user: User): Promise<BlockOutcome> => {
      if (!currentUser) return { kind: 'failure' };
      if (blockedUsers.length >= MAX_BLOCKED_USERS) return { kind: 'limit-exceeded' };
      setLoading(true);
      try {
        await blockUser(currentUser.uid, user.uid);
        setBlockedUsers((prev) => [...prev, user]);
        toast.success(`${user.nickname}님을 비공개 사용자로 설정했습니다.`, TOAST_OPTIONS);
        return { kind: 'success' };
      } catch {
        toast.error('비공개 사용자 설정 중 오류가 발생했습니다.', TOAST_OPTIONS);
        return { kind: 'failure' };
      } finally {
        setLoading(false);
      }
    },
    [currentUser, blockedUsers.length],
  );

  const unblock = useCallback(
    async (uid: string): Promise<UnblockOutcome> => {
      if (!currentUser) return { kind: 'failure' };
      setLoading(true);
      try {
        await unblockUser(currentUser.uid, uid);
        const removed = blockedUsers.find((u) => u.uid === uid);
        setBlockedUsers((prev) => prev.filter((u) => u.uid !== uid));
        toast.success(`${removed?.nickname}님의 비공개 설정을 해제했습니다.`, TOAST_OPTIONS);
        return { kind: 'success' };
      } catch {
        toast.error('비공개 설정 해제 중 오류가 발생했습니다.', TOAST_OPTIONS);
        return { kind: 'failure' };
      } finally {
        setLoading(false);
      }
    },
    [currentUser, blockedUsers],
  );

  return {
    blockedUsers,
    loading,
    isAtLimit: blockedUsers.length >= MAX_BLOCKED_USERS,
    block,
    unblock,
  };
}
