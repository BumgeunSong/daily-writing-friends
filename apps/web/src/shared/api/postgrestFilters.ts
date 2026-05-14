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
 *     `"` `:` `.` and any whitespace) are UTF-8 percent-encoded so they cannot
 *     break out of the value position. `encodeURIComponent` is used so
 *     non-ASCII whitespace (NBSP U+00A0, U+2028, U+3000, etc.) is encoded as
 *     valid UTF-8 byte sequences (e.g. NBSP → `%C2%A0`) rather than ambiguous
 *     code-point hex (`%A0` / `%2028`).
 *
 * The caller wraps the returned token with `%…%` before passing to `.ilike()`.
 */
export function escapeForOrFilter(input: string): string {
  const ilikeEscaped = input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

  return ilikeEscaped.replace(/[,()*":.\s]/g, (ch) => {
    const code = ch.charCodeAt(0);
    // ASCII (< 0x80): one byte, encode directly. `encodeURIComponent` would leave
    // `. ( ) *` untouched, so we must do it ourselves.
    if (code < 0x80) {
      return `%${code.toString(16).toUpperCase().padStart(2, '0')}`;
    }
    // Non-ASCII whitespace (NBSP, U+2028, U+3000, …): encode as UTF-8 bytes.
    return encodeURIComponent(ch);
  });
}
