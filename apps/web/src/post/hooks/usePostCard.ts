import { useEffect, useMemo } from 'react';
import type { PostAuthorData } from '@/post/components/PostUserProfile';
import type { PostCardPrefetchedData } from '@/post/hooks/useBatchPostCardData';
import { type Post, PostVisibility } from '@/post/model/Post';
import { renderPostPreviewHtml } from '@/post/utils/contentUtils';
import { devLog } from '@/shared/utils/devLog';
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
  isDonator: boolean;
  contentPreview: string | null;
}

/**
 * @param post - Post data
 * @param prefetched - Batch-fetched data (when available)
 * @param isBatchMode - When true, individual hooks are disabled even while batch is loading
 */
export const usePostCard = (
  post: Post,
  prefetched?: PostCardPrefetchedData,
  isBatchMode?: boolean,
): UsePostCardReturn => {
  // Disable individual fetches when batch mode is active (prevents race condition N+1)
  const skipIndividual = !!isBatchMode;
  const { userData, isLoading: isAuthorLoading } = useUser(skipIndividual ? null : post.authorId);
  const { data: badges } = usePostProfileBadges(skipIndividual ? '' : post.authorId);
  const { data: streakData, isLoading: isStreakLoading } = usePostingStreak(skipIndividual ? '' : post.authorId);

  const isPrivate = post.visibility === PostVisibility.PRIVATE;
  const contentPreview = useMemo(
    () => (!isPrivate ? renderPostPreviewHtml(post.content) : null),
    [post.content, isPrivate],
  );

  const authorData: PostAuthorData = useMemo(() => {
    if (prefetched) {
      return {
        ...prefetched.authorData,
        displayName: prefetched.authorData.displayName || post.authorName || '??',
        profileImageURL: prefetched.authorData.profileImageURL || post.authorProfileImageURL || '',
      };
    }
    return {
      id: post.authorId,
      displayName: userData ? getUserDisplayName(userData) : post.authorName,
      profileImageURL: userData?.profilePhotoURL || post.authorProfileImageURL || '',
    };
  }, [prefetched, post.authorId, userData, post.authorName, post.authorProfileImageURL]);

  // Diagnostic: batch mode active but no prefetched data for this author.
  // Fires during initial load (transient) AND on persistent map-misses (real bug).
  // Production no-op via devLog. Accept dev-mode noise as the tradeoff for catching
  // silent regressions where a fetcher gets dropped from the Promise.all.
  useEffect(() => {
    if (isBatchMode && !prefetched && post.authorId) {
      devLog({
        category: 'usePostCard',
        event: 'batch-data-miss',
        level: 'warn',
        data: { authorId: post.authorId },
      });
    }
  }, [isBatchMode, prefetched, post.authorId]);

  return {
    authorData,
    isAuthorLoading: prefetched ? false : isAuthorLoading,
    badges: prefetched ? prefetched.badges : badges,
    streak: prefetched ? prefetched.streak : streakData?.streak,
    isStreakLoading: prefetched ? false : isStreakLoading,
    isPrivate,
    isDonator: prefetched?.isDonator ?? false,
    contentPreview,
  };
};
