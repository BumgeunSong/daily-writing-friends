/**
 * Merges current user stats at the front of the list
 * Used to ensure current user's stats card appears first in the list
 */
export function mergeCurrentUserFirst<T>(
  currentUserStats: T | undefined,
  otherUsersStats: T[] | undefined
): T[] | undefined {
  if (!otherUsersStats) return undefined;
  if (!currentUserStats) return otherUsersStats;
  return [currentUserStats, ...otherUsersStats];
}
