import { useMemo } from 'react';
import type { PostAuthorData } from '@/post/components/PostUserProfile';
import type { PostCardPrefetchedData } from '@/post/hooks/useBatchPostCardData';
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

export const usePostCard = (post: Post, prefetched?: PostCardPrefetchedData): UsePostCardReturn => {
  // Skip individual fetches when prefetched data is available
  const { userData, isLoading: isAuthorLoading } = useUser(prefetched ? null : post.authorId);
  const { data: badges } = usePostProfileBadges(prefetched ? '' : post.authorId);
  const { data: streakData, isLoading: isStreakLoading } = usePostingStreak(prefetched ? '' : post.authorId);

  const isPrivate = post.visibility === PostVisibility.PRIVATE;
  const contentPreview = useMemo(
    () => (!isPrivate ? getContentPreview(post.content) : null),
    [post.content, isPrivate],
  );

  const authorData: PostAuthorData = useMemo(() => {
    if (prefetched) return prefetched.authorData;
    return {
      id: post.authorId,
      displayName: userData ? getUserDisplayName(userData) : post.authorName,
      profileImageURL: userData?.profilePhotoURL || post.authorProfileImageURL || '',
    };
  }, [prefetched, post.authorId, userData, post.authorProfileImageURL]);

  return {
    authorData,
    isAuthorLoading: prefetched ? false : isAuthorLoading,
    badges: prefetched ? prefetched.badges : badges,
    streak: prefetched ? prefetched.streak : streakData?.streak,
    isStreakLoading: prefetched ? false : isStreakLoading,
    isPrivate,
    contentPreview,
  };
};
