/**
 * Supabase Read Functions
 *
 * File scheduled for removal per docs/plans/2026-05-10-supabasereads-feature-split.md.
 * All entity reads have moved to feature folders; only formatInFilter remains pending Task 11.
 */

/** Format string array as PostgREST `in.(...)` value with proper quoting */
export function formatInFilter(values: string[]): string {
  const quoted = values.map((v) => `"${v.replace(/"/g, '""')}"`);
  return `(${quoted.join(',')})`;
}
