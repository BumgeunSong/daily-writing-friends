import type { Posting } from '@/post/model/Posting';
import { getDateKey } from '@/shared/utils/dateUtils';
import type { WritingStats, Contribution } from '@/stats/model/WritingStats';

/**
 * Accumulates posting content lengths by date
 * Returns a map of dateKey -> total content length
 */
export function accumulatePostingLengths(postings: Posting[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const posting of postings) {
    const key = getDateKey(posting.createdAt.toDate());
    const currentSum = map.get(key) || 0;
    map.set(key, currentSum + posting.post.contentLength);
  }
  return map;
}

/**
 * Creates a contribution object for a given date
 */
export function toContribution(
  key: string,
  lengthMap: Map<string, number>,
): Contribution {
  const contentLength = lengthMap.has(key) ? lengthMap.get(key)! : null;
  return { createdAt: key, contentLength };
}

/**
 * Creates contribution array from postings and working days
 */
export function createContributions(
  postings: Posting[],
  workingDays: Date[],
): Contribution[] {
  const lengthMap = accumulatePostingLengths(postings);
  return workingDays.map((day) => toContribution(getDateKey(day), lengthMap));
}

/**
 * Gets total content length from contributions
 */
export function getTotalContentLength(contributions: Contribution[]): number {
  return contributions.reduce(
    (sum, contribution) => sum + (contribution.contentLength ?? 0),
    0,
  );
}

/**
 * Sorts writing stats with current user first, then by total content length descending
 */
export function sortWritingStats(
  writingStats: WritingStats[],
  currentUserId?: string,
): WritingStats[] {
  return [...writingStats].sort((a, b) => {
    // Current user always comes first
    if (currentUserId) {
      if (a.user.id === currentUserId && b.user.id !== currentUserId) {
        return -1;
      }
      if (b.user.id === currentUserId && a.user.id !== currentUserId) {
        return 1;
      }
    }

    // Sort by total content length only
    const aContentLengthSum = getTotalContentLength(a.contributions);
    const bContentLengthSum = getTotalContentLength(b.contributions);
    return bContentLengthSum - aContentLengthSum;
  });
}
