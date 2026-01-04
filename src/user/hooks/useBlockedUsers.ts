import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/shared/hooks/useAuth';
import { blockUser, unblockUser, getBlockedUsers, fetchUser } from '@/user/api/user';
import type { User } from '@/user/model/User';

const BLOCKED_USERS_LIMIT = 10;

export interface BlockedUser {
  uid: string;
  nickname: string;
  email: string | null;
  profilePhotoURL: string | null;
}

export function useBlockedUsers() {
  const { currentUser } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load blocked users on mount
  useEffect(() => {
    if (!currentUser) {
      setIsInitialLoading(false);
      return;
    }

    const loadBlockedUsers = async () => {
      try {
        const blockedUids = await getBlockedUsers(currentUser.uid);
        if (!blockedUids || blockedUids.length === 0) {
          setBlockedUsers([]);
          return;
        }

        const users = await Promise.all(
          blockedUids.map((uid) => fetchUser(uid))
        );

        const validUsers = users
          .filter((user): user is User => user !== null)
          .map((user) => ({
            uid: user.uid,
            nickname: user.nickname ?? '',
            email: user.email,
            profilePhotoURL: user.profilePhotoURL,
          }));

        setBlockedUsers(validUsers);
      } catch (error) {
        console.error('Failed to load blocked users:', error);
        toast.error('비공개 사용자 목록을 불러오는데 실패했습니다.', { position: 'bottom-center' });
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadBlockedUsers();
  }, [currentUser]);

  const blockUserAction = useCallback(
    async (userToBlock: BlockedUser) => {
      if (!currentUser) return false;

      if (blockedUsers.length >= BLOCKED_USERS_LIMIT) {
        return false;
      }

      setIsLoading(true);
      try {
        await blockUser(currentUser.uid, userToBlock.uid);
        setBlockedUsers((prev) => [...prev, userToBlock]);
        toast.success(`${userToBlock.nickname}님을 비공개 사용자로 설정했습니다.`, {
          position: 'bottom-center',
        });
        return true;
      } catch (error) {
        console.error('Failed to block user:', error);
        toast.error('비공개 사용자 설정 중 오류가 발생했습니다.', { position: 'bottom-center' });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser, blockedUsers.length]
  );

  const unblockUserAction = useCallback(
    async (uidToUnblock: string) => {
      if (!currentUser) return false;

      setIsLoading(true);
      try {
        await unblockUser(currentUser.uid, uidToUnblock);
        const user = blockedUsers.find((u) => u.uid === uidToUnblock);
        setBlockedUsers((prev) => prev.filter((u) => u.uid !== uidToUnblock));
        toast.success(`${user?.nickname}님의 비공개 설정을 해제했습니다.`, {
          position: 'bottom-center',
        });
        return true;
      } catch (error) {
        console.error('Failed to unblock user:', error);
        toast.error('비공개 설정 해제 중 오류가 발생했습니다.', { position: 'bottom-center' });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser, blockedUsers]
  );

  return {
    blockedUsers,
    isLoading,
    isInitialLoading,
    isAtLimit: blockedUsers.length >= BLOCKED_USERS_LIMIT,
    blockedCount: blockedUsers.length,
    maxBlockedUsers: BLOCKED_USERS_LIMIT,
    blockUser: blockUserAction,
    unblockUser: unblockUserAction,
  };
}
