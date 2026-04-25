import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { PostAuthorData } from '@/post/components/PostUserProfile';
import type { Post } from '@/post/model/Post';
import {
  fetchBatchUsersBasic,
  fetchBatchCommentUserIdsByDateRange,
  fetchBatchReplyUserIdsByDateRange,
  fetchBatchPostDatesByDateRange,
  type BasicUserRow,
  type UserIdRow,
  type PostDateRow,
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

export function deduplicateAuthorIds(posts: Post[]): string[] {
  return [...new Set(posts.map(p => p.authorId).filter(Boolean))];
}

export function buildPostCardDataMap(
  authorIds: string[],
  users: BasicUserRow[],
  commentRows: UserIdRow[],
  replyRows: UserIdRow[],
  postRows: PostDateRow[],
  workingDays: Date[],
): Map<string, PostCardPrefetchedData> {
  const usersMap = new Map(users.map(u => [u.id, u]));

  const activityCountMap = new Map<string, number>();
  for (const row of [...commentRows, ...replyRows]) {
    activityCountMap.set(row.user_id, (activityCountMap.get(row.user_id) ?? 0) + 1);
  }

  const postDatesMap = new Map<string, Set<string>>();
  for (const row of postRows) {
    if (!postDatesMap.has(row.author_id)) postDatesMap.set(row.author_id, new Set());
    postDatesMap.get(row.author_id)!.add(getDateKey(new Date(row.created_at)));
  }

  const result = new Map<string, PostCardPrefetchedData>();
  for (const authorId of authorIds) {
    const user = usersMap.get(authorId);

    const authorData: PostAuthorData = {
      id: authorId,
      displayName: user?.nickname?.trim() || user?.real_name?.trim() || '??',
      profileImageURL: user?.profile_photo_url ?? '',
    };

    const totalComments = activityCountMap.get(authorId) ?? 0;
    const temperature = calculateCommentTemperature(totalComments);
    const badges: WritingBadge[] = temperature > 0
      ? [{ name: `${temperature}℃`, emoji: '🌡️' }]
      : [];

    const postDates = postDatesMap.get(authorId) ?? new Set<string>();
    const streak = workingDays.map(day => postDates.has(getDateKey(day)));

    result.set(authorId, { authorData, badges, streak });
  }

  return result;
}

export function useBatchPostCardData(posts: Post[]) {
  const authorIds = useMemo(
    () => deduplicateAuthorIds(posts),
    [posts],
  );
  const authorIdsKey = useMemo(
    () => [...authorIds].sort((a, b) => a.localeCompare(b)).join(','),
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

  const [users, commentRows, replyRows, postRows] = await Promise.all([
    fetchBatchUsersBasic(authorIds),
    fetchBatchCommentUserIdsByDateRange(authorIds, badgeDateRange.start, badgeDateRange.end),
    fetchBatchReplyUserIdsByDateRange(authorIds, badgeDateRange.start, badgeDateRange.end),
    fetchBatchPostDatesByDateRange(authorIds, streakDateRange.start, streakDateRange.end),
  ]);

  return buildPostCardDataMap(authorIds, users, commentRows, replyRows, postRows, workingDays5);
}
