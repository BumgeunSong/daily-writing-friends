/**
 * PostgREST query-builder helpers for Supabase queries.
 */

/** Format string array as PostgREST `in.(...)` value with proper quoting. */
export function formatInFilter(values: string[]): string {
  const quoted = values.map((v) => `"${v.replace(/"/g, '""')}"`);
  return `(${quoted.join(',')})`;
}

/**
 * Escape a user-supplied keyword so it is safe to interpolate into a
 * PostgREST `.or('title.ilike.<value>,content.ilike.<value>')` filter.
 *
 * Two layers:
 *  1. SQL `ILIKE` wildcards (`\` `%` `_`) are escaped with `\` so the literal
 *     character is matched (Postgres uses `\` as the default escape character).
 *  2. PostgREST `.or()` value-segment reserved characters (`,` `(` `)` `*`
 *     `"` `:` `.` and any whitespace) are percent-encoded so they cannot break
 *     out of the value position and start a new filter clause.
 *
 * The caller wraps the returned token with `%…%` before passing to `.ilike()`.
 */
export function escapeForOrFilter(input: string): string {
  const ilikeEscaped = input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');

  return ilikeEscaped.replace(/[,()*":.\s]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return '%' + code.toString(16).toUpperCase().padStart(2, '0');
  });
}
