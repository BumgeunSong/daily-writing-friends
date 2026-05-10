/**
 * PostgREST query-builder helpers for Supabase queries.
 */

/** Format string array as PostgREST `in.(...)` value with proper quoting. */
export function formatInFilter(values: string[]): string {
  const quoted = values.map((v) => `"${v.replace(/"/g, '""')}"`);
  return `(${quoted.join(',')})`;
}
