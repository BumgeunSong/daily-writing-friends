import type { PostAuthorData } from '@/post/components/PostUserProfile';
import type { BasicUserRow } from '@/user/external/user.reads';
import type { UserIdRow, PostDateRow } from '@/stats/external/stats.api';
import { getDateKey } from '@/shared/utils/dateUtils';
import { calculateCommentTemperature } from '@/stats/utils/commentTemperature';
import type { WritingBadge } from '@/stats/model/WritingStats';
import type { Post } from '@/post/model/Post';

export interface PostCardPrefetchedData {
  authorData: PostAuthorData;
  badges: WritingBadge[];
  streak: boolean[];
  isDonator: boolean;
}

export function deduplicateAuthorIds(posts: Post[]): string[] {
  return [...new Set(posts.map(p => p.authorId).filter(Boolean))];
}

/**
 * Splits an append-only list of post pages into author-id groups that share no
 * author, keeping each author in the earliest page they appear on.
 *
 * Grouping exists to keep cache keys stable. Keying one query on the whole
 * list means every new page re-keys it, which drops the data of authors that
 * already resolved and reverts their cards to the loading shape. Because pages
 * only ever get appended, an earlier group's contents can never change, so its
 * key and its cached data survive every later page.
 */
export function toDisjointAuthorIdGroups(postPages: Post[][]): string[][] {
  const claimedAuthorIds = new Set<string>();
  return postPages.map((page) => {
    const unclaimed = deduplicateAuthorIds(page).filter((id) => !claimedAuthorIds.has(id));
    unclaimed.forEach((id) => claimedAuthorIds.add(id));
    return unclaimed;
  });
}

/** Groups are disjoint, so later entries can never overwrite earlier ones. */
export function mergeAuthorDataMaps(
  maps: (Map<string, PostCardPrefetchedData> | undefined)[],
): Map<string, PostCardPrefetchedData> {
  const merged = new Map<string, PostCardPrefetchedData>();
  for (const map of maps) {
    if (!map) continue;
    for (const [authorId, prefetchedData] of map) {
      merged.set(authorId, prefetchedData);
    }
  }
  return merged;
}

export interface BuildPostCardDataMapInput {
  authorIds: string[];
  users: BasicUserRow[];
  commentRows: UserIdRow[];
  replyRows: UserIdRow[];
  postRows: PostDateRow[];
  streakWorkingDays: Date[];
  donatorIds: Set<string>;
}

export function buildPostCardDataMap({
  authorIds,
  users,
  commentRows,
  replyRows,
  postRows,
  streakWorkingDays,
  donatorIds,
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

    result.set(authorId, {
      authorData,
      badges,
      streak,
      isDonator: donatorIds.has(authorId),
    });
  }

  return result;
}
