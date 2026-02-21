import { useMemo } from 'react';
import { PostAuthorData } from '@/post/components/PostUserProfile';
import { type Post, PostVisibility } from '@/post/model/Post';
import { getContentPreview } from '@/post/utils/contentUtils';
import { usePostingStreak } from '@/stats/hooks/usePostingStreak';
import { usePostProfileBadges } from '@/stats/hooks/usePostProfileBadges';
import { WritingBadge } from '@/stats/model/WritingStats';

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
      displayName: post.authorName,
      profileImageURL: post.authorProfileImageURL || '',
    }),
    [post.authorId, post.authorName, post.authorProfileImageURL],
  );

  return {
    authorData,
    isAuthorLoading: false,
    badges,
    streak: streakData?.streak,
    isStreakLoading,
    isPrivate,
    contentPreview,
  };
};
