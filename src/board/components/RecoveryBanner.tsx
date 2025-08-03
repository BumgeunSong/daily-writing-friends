'use client';

import { SystemPostCard } from '@/post/components/SystemPostCard';
import { useAuth } from '@/shared/hooks/useAuth';
import { useWritingStats } from '@/stats/hooks/useWritingStats';
import { useUserRecoveryStatus } from '@/user/hooks/useUserRecoveryStatus';

interface RecoveryBannerProps {
  boardId: string;
}

const RECOVERY_MESSAGES = {
  eligible: {
    title: '어제 streak를 놓쳤어요!',
    content: '오늘 2개의 글을 작성하면 연속 일수를 복구할 수 있어요.',
  },
  partial: {
    title: '1/2 완료',
    content: '1개 더 작성하면 streak가 복구돼요!',
  },
  success: {
    title: '복구 성공!',
    content: '연속 일수가 복구되었어요.',
  },
} as const;

export function RecoveryBanner({ boardId: _ }: RecoveryBannerProps) {
  const { currentUser } = useAuth();
  const { recoveryStatus, isLoading } = useUserRecoveryStatus(currentUser?.uid || '');
  const { data: writingStats } = useWritingStats(
    currentUser?.uid ? [currentUser.uid] : [],
    currentUser?.uid,
  );

  if (!currentUser || isLoading) return null;

  // Only show banner for eligible, partial, and success states
  if (recoveryStatus === 'none') return null;

  const message = RECOVERY_MESSAGES[recoveryStatus];

  // For success status, show the current streak in the content
  let content: string = message.content;
  if (recoveryStatus === 'success') {
    const currentStreak = writingStats?.[0]?.recentStreak || 0;
    content = `연속 ${currentStreak}일로 복구되었어요.`;
  }

  return (
    <SystemPostCard
      title={message.title}
      content={content}
      isOnlyForCurrentUser={true}
      authorData={{
        id: 'system',
        profileImageURL: '',
        displayName: '매글푸들',
      }}
    />
  );
}
