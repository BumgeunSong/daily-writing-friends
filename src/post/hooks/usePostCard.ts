import { useMemo } from 'react';
import { PostAuthorData } from '@/post/components/PostUserProfile';
import { type Post, PostVisibility } from '@/post/model/Post';
import { getContentPreview } from '@/post/utils/contentUtils';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { usePostingStreak } from '@/stats/hooks/usePostingStreak';
import { usePostProfileBadges } from '@/stats/hooks/usePostProfileBadges';
import { WritingBadge } from '@/stats/model/WritingStats';
import { useUser } from '@/user/hooks/useUser';

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
  const { userData: authorUser, isLoading: isAuthorLoading } = useUser(post.authorId);
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
      displayName: getUserDisplayName(authorUser),
      profileImageURL: authorUser?.profilePhotoURL || '',
    }),
    [post.authorId, authorUser],
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
