import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { PostAuthorData } from '@/post/components/PostUserProfile';
import type { Post } from '@/post/model/Post';
import {
  fetchBatchUsersBasic,
  fetchBatchCommentCountsByDateRange,
  fetchBatchReplyCountsByDateRange,
  fetchBatchPostDatesByDateRange,
} from '@/shared/api/supabaseReads';
import { getRecentWorkingDays, getDateKey } from '@/shared/utils/dateUtils';
import { getDateRange } from '@/stats/api/stats';
import { calculateCommentTemperature } from '@/stats/utils/commentTemperature';
import type { WritingBadge } from '@/stats/model/WritingStats';

export interface PostCardPrefetchedData {
  authorData: PostAuthorData;
  badges: WritingBadge[];
  streak: boolean[];
}

export function useBatchPostCardData(posts: Post[]) {
  const authorIds = useMemo(
    () => [...new Set(posts.map(p => p.authorId).filter(Boolean))],
    [posts],
  );
  const authorIdsKey = useMemo(
    () => [...authorIds].sort().join(','),
    [authorIds],
  );

  return useQuery({
    queryKey: ['batchPostCardData', authorIdsKey],
    queryFn: () => fetchBatchPostCardData(authorIds),
    enabled: authorIds.length > 0,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

async function fetchBatchPostCardData(
  authorIds: string[],
): Promise<Map<string, PostCardPrefetchedData>> {
  const workingDays5 = getRecentWorkingDays(5);
  const workingDays20 = getRecentWorkingDays(20);
  const badgeDateRange = getDateRange(workingDays20);
  const streakDateRange = getDateRange(workingDays5);

  // 4 batch queries instead of 4N individual queries
  const [users, commentRows, replyRows, postRows] = await Promise.all([
    fetchBatchUsersBasic(authorIds),
    fetchBatchCommentCountsByDateRange(authorIds, badgeDateRange.start, badgeDateRange.end),
    fetchBatchReplyCountsByDateRange(authorIds, badgeDateRange.start, badgeDateRange.end),
    fetchBatchPostDatesByDateRange(authorIds, streakDateRange.start, streakDateRange.end),
  ]);

  // Users map
  const usersMap = new Map(users.map(u => [u.id, u]));

  // Comment+reply total count per user (for badge temperature)
  const commentCountMap = new Map<string, number>();
  for (const row of [...commentRows, ...replyRows]) {
    commentCountMap.set(row.user_id, (commentCountMap.get(row.user_id) ?? 0) + 1);
  }

  // Post dates per user (for streak)
  const postDatesMap = new Map<string, Set<string>>();
  for (const row of postRows) {
    if (!postDatesMap.has(row.author_id)) postDatesMap.set(row.author_id, new Set());
    postDatesMap.get(row.author_id)!.add(getDateKey(new Date(row.created_at)));
  }

  // Build result
  const result = new Map<string, PostCardPrefetchedData>();
  for (const authorId of authorIds) {
    const user = usersMap.get(authorId);

    const authorData: PostAuthorData = {
      id: authorId,
      displayName: user?.nickname?.trim() || user?.real_name || undefined,
      profileImageURL: user?.profile_photo_url ?? '',
    };

    const totalComments = commentCountMap.get(authorId) ?? 0;
    const temperature = calculateCommentTemperature(totalComments);
    const badges: WritingBadge[] = temperature > 0
      ? [{ name: `${temperature}℃`, emoji: '🌡️' }]
      : [];

    const postDates = postDatesMap.get(authorId) ?? new Set<string>();
    const streak = workingDays5.map(day => postDates.has(getDateKey(day)));

    result.set(authorId, { authorData, badges, streak });
  }

  return result;
}
