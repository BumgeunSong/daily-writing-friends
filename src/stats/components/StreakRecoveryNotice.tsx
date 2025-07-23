import { SystemPostCard } from '@/post/components/SystemPostCard';
import { useStreakRecoveryNotice } from '../hooks/useStreakRecoveryNotice';
import type { PostAuthorData } from '@/post/components/PostUserProfile';

const POODLE_AUTHOR_DATA: PostAuthorData = {
  id: 'system-poodle',
  displayName: '매글푸들',
  profileImageURL: '/admin-poodle-icon.webp',
};

interface StreakRecoveryNoticeProps {
  onClickContent?: () => void;
}

/**
 * Shows SystemPostCard for streak recovery notices
 * Only appears when user is eligible for recovery and needs to write posts
 */
export function StreakRecoveryNotice({ onClickContent }: StreakRecoveryNoticeProps) {
  const notice = useStreakRecoveryNotice();

  if (!notice?.show) {
    return null;
  }

  return (
    <SystemPostCard
      onClickContent={onClickContent}
      isOnlyForCurrentUser={true}
      authorData={POODLE_AUTHOR_DATA}
      title={notice.title}
      content={notice.content}
    />
  );
}
