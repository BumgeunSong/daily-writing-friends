import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStreakInfo } from '../api/streakInfo';
import type { StreakInfo } from '../model/StreakInfo';
import { useAuth } from '@/shared/hooks/useAuth';

interface StreakRecoveryNotice {
  show: boolean;
  title: string;
  content: string;
}

/**
 * Hook to determine if and what streak recovery notice to show
 * Returns notice data for SystemPostCard or null if no notice needed
 */
export function useStreakRecoveryNotice(): StreakRecoveryNotice | null {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  const {
    data: streakInfo,
    isLoading,
    error
  } = useQuery(
    ['streakInfo', userId],
    () => fetchStreakInfo(userId!),
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
    }
  );

  const notice = useMemo(() => {
    if (isLoading || error || !streakInfo) {
      return null;
    }
    return createRecoveryNotice(streakInfo);
  }, [streakInfo, isLoading, error]);

  return notice;
}

/**
 * Creates recovery notice based on streak info
 * Returns null if no notice should be shown
 */
function createRecoveryNotice(streakInfo: StreakInfo | null): StreakRecoveryNotice | null {
  // Show nothing for 'missed' or 'onStreak'
  if (!streakInfo || streakInfo.status.type !== 'eligible') {
    return null;
  }

  const { postsRequired = 0, currentPosts = 0, deadline } = streakInfo.status;
  const postsNeeded = postsRequired - currentPosts;

  // Only show notice if user needs to write 1 or 2+ posts
  if (postsNeeded <= 0) {
    return null;
  }

  const deadlineText = formatDeadline(deadline);

  if (postsNeeded === 1) {
    return {
      show: true,
      title: '딱 하나 남았어요!',
      content: `글을 ${currentPosts}개 쓰셨네요. 이제 ${postsNeeded}개만 더 쓰면 연속 일수가 다시 되살아나요. 글 쓰고 연속 일수 살리러 가기 >`,
    };
  }

  if (postsNeeded >= 2) {
    return {
      show: true,
      title: '아직 죽지 않았어요!',
      content: `매일 글쓰기를 놓치셨네요 ㅜ 하지만 ${deadlineText}까지 ${postsNeeded}개의 글을 쓰면 연속일수를 되살릴 수 있어요. 글 쓰고 연속 일수 살리러 가기 >`,
    };
  }

  return null;
}

/**
 * Formats deadline string for display
 */
function formatDeadline(deadline?: string): string {
  if (!deadline) {
    return '오늘';
  }

  const deadlineDate = new Date(deadline);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Reset time parts for accurate date comparison
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);

  if (deadlineDate.getTime() === today.getTime()) {
    return '오늘';
  } else if (deadlineDate.getTime() === tomorrow.getTime()) {
    return '내일';
  } else {
    const daysFromNow = Math.ceil(
      (deadlineDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (daysFromNow > 0) {
      return `${daysFromNow}일 후`;
    } else {
      return '오늘';
    }
  }
}
