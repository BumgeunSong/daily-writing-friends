import type { PostAuthorData } from '@/post/components/PostUserProfile';
import type { BasicUserRow } from '@/user/api/userReads';
import type { UserIdRow, PostDateRow } from '@/shared/api/supabaseReads';
import { getDateKey } from '@/shared/utils/dateUtils';
import { calculateCommentTemperature } from '@/stats/utils/commentTemperature';
import type { WritingBadge } from '@/stats/model/WritingStats';
import type { Post } from '@/post/model/Post';

export interface PostCardPrefetchedData {
  authorData: PostAuthorData;
  badges: WritingBadge[];
  streak: boolean[];
}

export function deduplicateAuthorIds(posts: Post[]): string[] {
  return [...new Set(posts.map(p => p.authorId).filter(Boolean))];
}

export interface BuildPostCardDataMapInput {
  authorIds: string[];
  users: BasicUserRow[];
  commentRows: UserIdRow[];
  replyRows: UserIdRow[];
  postRows: PostDateRow[];
  streakWorkingDays: Date[];
}

export function buildPostCardDataMap({
  authorIds,
  users,
  commentRows,
  replyRows,
  postRows,
  streakWorkingDays,
}: BuildPostCardDataMapInput): Map<string, PostCardPrefetchedData> {
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
    const streak = streakWorkingDays.map(day => postDates.has(getDateKey(day)));

    result.set(authorId, { authorData, badges, streak });
  }

  return result;
}
