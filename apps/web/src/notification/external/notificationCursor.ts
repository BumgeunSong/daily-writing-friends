/**
 * Keyset cursor for the notification feed. `createdAt` is the raw Postgres
 * `created_at` text (microsecond precision) — NOT a `Date`, which would truncate
 * to milliseconds and drop microsecond-siblings on the next page.
 */
export interface NotificationCursor {
  createdAt: string;
  id: string;
}

/** Minimal raw-row shape the cursor needs; the boundary select provides both. */
interface CursorSourceRow {
  created_at: string;
  id: string;
}

/**
 * PostgREST `or` predicate for "rows strictly older than the cursor" under
 * `ORDER BY created_at DESC, id DESC`:
 *   created_at < X  OR  (created_at = X AND id < Y)
 *
 * `created_at` is not unique, so a strict `created_at.lt` alone drops every row
 * sharing the cursor's timestamp — the `id` tiebreaker keeps them. Values are
 * double-quoted PostgREST-style so any reserved character stays inside the value.
 */
export function buildKeysetOrFilter(cursor: NotificationCursor): string {
  const { createdAt, id } = cursor;
  return (
    `created_at.lt."${createdAt}",` +
    `and(created_at.eq."${createdAt}",id.lt."${id}")`
  );
}

/**
 * The cursor for the next page: the last row of a full page. A partial or empty
 * page means there is nothing after it, so return null and let pagination stop
 * without an extra round-trip.
 */
export function deriveNextCursor(
  rows: CursorSourceRow[],
  limitCount: number,
): NotificationCursor | null {
  if (rows.length === 0 || rows.length < limitCount) return null;
  const last = rows[rows.length - 1];
  return { createdAt: last.created_at, id: last.id };
}
