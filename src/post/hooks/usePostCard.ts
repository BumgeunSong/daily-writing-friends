import { useMemo } from 'react';
import type { PostAuthorData } from '@/post/components/PostUserProfile';
import { type Post, PostVisibility } from '@/post/model/Post';
import { getContentPreview } from '@/post/utils/contentUtils';
import { usePostingStreak } from '@/stats/hooks/usePostingStreak';
import { usePostProfileBadges } from '@/stats/hooks/usePostProfileBadges';
import type { WritingBadge } from '@/stats/model/WritingStats';
import { useUser } from '@/user/hooks/useUser';
import { getUserDisplayName } from '@/shared/utils/userUtils';

export interface UsePostCardReturn {
  authorData: PostAuthorData;
  isAuthorLoading: boolean;
  badges: WritingBadge[] | undefined;
  streak?: boolean[];
  isStreakLoading: boolean;
  isPrivate: boolean;
  contentPreview: string | null;
}

export const usePostCard = (post: Post): UsePostCardReturn => {
  const { userData, isLoading: isAuthorLoading } = useUser(post.authorId);
  const { data: badges } = usePostProfileBadges(post.authorId);
  const { data: streakData, isLoading: isStreakLoading } = usePostingStreak(post.authorId);

  const isPrivate = post.visibility === PostVisibility.PRIVATE;
  const contentPreview = useMemo(
    () => (!isPrivate ? getContentPreview(post.content) : null),
    [post.content, isPrivate],
  );

  const authorData: PostAuthorData = useMemo(
    () => ({
      id: post.authorId,
      displayName: userData ? getUserDisplayName(userData) : post.authorName,
      profileImageURL: userData?.profilePhotoURL || post.authorProfileImageURL || '',
    }),
    [post.authorId, userData, post.authorProfileImageURL],
  );

  return {
    authorData,
    isAuthorLoading,
    badges,
    streak: streakData?.streak,
    isStreakLoading,
    isPrivate,
    contentPreview,
  };
};
