import type { User } from '@/user/model/User';

export const MAX_BLOCKED_USERS = 10;
export const MAX_SEARCH_SUGGESTIONS = 5;

export interface BlockedUsersFromSettledResult {
  users: User[];
  rejectedCount: number;
  totalCount: number;
}

/**
 * Reduce a batch of `fetchUser` outcomes into the typed slice the page needs.
 * Drops null payloads (deleted users) so the rejected count cleanly separates
 * "fetch failed" from "user no longer exists" — the page uses this distinction
 * to decide between the "some failed" warning and the "all failed" error toast.
 */
export function mapBlockedUsersFromSettled(
  results: PromiseSettledResult<User | null>[],
): BlockedUsersFromSettledResult {
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<User | null> => r.status === 'fulfilled',
  );
  const users = fulfilled.map((r) => r.value).filter((u): u is User => u !== null);
  return {
    users,
    rejectedCount: results.length - fulfilled.length,
    totalCount: results.length,
  };
}

/**
 * Filter search results into actionable block suggestions.
 * Excludes the current user themselves and anyone already blocked, then caps
 * the list so the dropdown stays scannable.
 */
export function filterBlockSuggestions(
  searchResult: User | User[] | null | undefined,
  blockedUsers: User[],
  currentUserUid: string | undefined,
  searchQuery: string,
): User[] {
  if (!searchResult || !searchQuery.trim()) return [];
  const blockedUids = new Set(blockedUsers.map((u) => u.uid));
  const candidates = Array.isArray(searchResult) ? searchResult : [searchResult];
  return candidates
    .filter((user) => user && user.uid !== currentUserUid && !blockedUids.has(user.uid))
    .slice(0, MAX_SEARCH_SUGGESTIONS);
}

/**
 * Pure keyboard navigation. Returns the next selected suggestion index, or
 * `null` if the key shouldn't change it. ArrowUp is clamped to 0; ArrowDown
 * intentionally is NOT clamped to a max — matches the original component's
 * behavior so this refactor doesn't quietly change UX.
 */
export function getNextSuggestionIndex(currentIndex: number, key: string): number | null {
  if (key === 'ArrowDown') return currentIndex + 1;
  if (key === 'ArrowUp') return Math.max(currentIndex - 1, 0);
  return null;
}

/** Pure helper: Escape closes the suggestions dropdown; everything else does not. */
export function isCloseSuggestionsKey(key: string): boolean {
  return key === 'Escape';
}
