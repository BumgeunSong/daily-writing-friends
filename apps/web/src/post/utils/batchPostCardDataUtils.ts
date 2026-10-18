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
 * Assigns every author to the earliest page they appear on, so that appending a
 * page leaves the earlier groups byte-identical. Callers key a cache per group
 * and rely on that: a group whose contents can change would drop already
 * resolved data and send its cards back to their loading shape.
 */
export function toDisjointAuthorIdGroups(postPages: Post[][]): string[][] {
  const claimedAuthorIds = new Set<string>();
  return postPages.map((page) => {
    const unclaimedAuthorIds = deduplicateAuthorIds(page).filter(
      (authorId) => !claimedAuthorIds.has(authorId),
    );
    unclaimedAuthorIds.forEach((authorId) => claimedAuthorIds.add(authorId));
    return unclaimedAuthorIds;
  });
}

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

const UNKNOWN_DISPLAY_NAME = '??';
const TEMPERATURE_BADGE_EMOJI = '🌡️';

function countActivityPerUser(activityRows: UserIdRow[]): Map<string, number> {
  const countPerUser = new Map<string, number>();
  for (const row of activityRows) {
    countPerUser.set(row.user_id, (countPerUser.get(row.user_id) ?? 0) + 1);
  }
  return countPerUser;
}

function collectPostedDateKeysPerAuthor(postRows: PostDateRow[]): Map<string, Set<string>> {
  const dateKeysPerAuthor = new Map<string, Set<string>>();
  for (const row of postRows) {
    const dateKeys = dateKeysPerAuthor.get(row.author_id) ?? new Set<string>();
    dateKeys.add(getDateKey(new Date(row.created_at)));
    dateKeysPerAuthor.set(row.author_id, dateKeys);
  }
  return dateKeysPerAuthor;
}

function toAuthorData(authorId: string, user: BasicUserRow | undefined): PostAuthorData {
  return {
    id: authorId,
    displayName: user?.nickname?.trim() || user?.real_name?.trim() || UNKNOWN_DISPLAY_NAME,
    profileImageURL: user?.profile_photo_url ?? '',
  };
}

function toTemperatureBadges(activityCount: number): WritingBadge[] {
  const temperature = calculateCommentTemperature(activityCount);
  if (temperature <= 0) return [];
  return [{ name: `${temperature}℃`, emoji: TEMPERATURE_BADGE_EMOJI }];
}

function toStreak(workingDays: Date[], postedDateKeys: Set<string>): boolean[] {
  return workingDays.map((day) => postedDateKeys.has(getDateKey(day)));
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
  const userById = new Map(users.map((user) => [user.id, user]));
  const activityCountByUser = countActivityPerUser([...commentRows, ...replyRows]);
  const postedDateKeysByAuthor = collectPostedDateKeysPerAuthor(postRows);

  return new Map(
    authorIds.map((authorId) => [
      authorId,
      {
        authorData: toAuthorData(authorId, userById.get(authorId)),
        badges: toTemperatureBadges(activityCountByUser.get(authorId) ?? 0),
        streak: toStreak(streakWorkingDays, postedDateKeysByAuthor.get(authorId) ?? new Set()),
        isDonator: donatorIds.has(authorId),
      },
    ]),
  );
}
