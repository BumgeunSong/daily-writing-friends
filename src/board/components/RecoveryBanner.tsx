'use client';

import { SystemPostCard } from '@/post/components/SystemPostCard';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUserRecoveryStatus } from '@/user/hooks/useUserRecoveryStatus';
import { useWritingStats } from '@/stats/hooks/useWritingStats';

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
  const { user } = useAuth();
  const { recoveryStatus, isLoading } = useUserRecoveryStatus(user?.uid || '');
  const { data: writingStats } = useWritingStats(user?.uid ? [user.uid] : [], user?.uid);
  
  if (!user || isLoading) return null;
  
  // Only show banner for eligible, partial, and success states
  if (recoveryStatus === 'none') return null;
  
  const message = RECOVERY_MESSAGES[recoveryStatus];
  
  // For success status, show the current streak in the content
  let content = message.content;
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
        profileImageUrl: '',
        name: '시스템',
        position: '운영진',
      }}
    />
  );
}