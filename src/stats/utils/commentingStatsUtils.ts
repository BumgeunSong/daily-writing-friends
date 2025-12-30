import type { UserCommentingStats } from '@/stats/hooks/useCommentingStats';

/**
 * Gets total comment and reply count from contributions
 */
export function getTotalCommentCount(contributions: { countOfCommentAndReplies: number | null }[]): number {
  return contributions.reduce((sum, c) => sum + (c.countOfCommentAndReplies ?? 0), 0);
}

/**
 * Sorts commenting stats with current user first, then by total comment count descending
 */
export function sortCommentingStats(
  stats: UserCommentingStats[],
  currentUserId?: string,
): UserCommentingStats[] {
  return [...stats].sort((a, b) => {
    // Current user always comes first
    if (currentUserId) {
      if (a.user.id === currentUserId && b.user.id !== currentUserId) {
        return -1;
      }
      if (b.user.id === currentUserId && a.user.id !== currentUserId) {
        return 1;
      }
    }

    // Sort by total comment count (descending)
    const aTotal = getTotalCommentCount(a.contributions);
    const bTotal = getTotalCommentCount(b.contributions);
    return bTotal - aTotal;
  });
}
