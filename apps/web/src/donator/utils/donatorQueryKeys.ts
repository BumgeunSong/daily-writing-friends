/**
 * Stabilizes a list of user IDs for use as a React Query key.
 * Sorting + dedupe means two callers with the same set of authors share a single
 * query, regardless of input order or duplicates.
 */
export function buildDonatorQueryIds(userIds: string[]): string[] {
  return [...new Set(userIds)].sort();
}
