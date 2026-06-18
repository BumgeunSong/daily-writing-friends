import { PostVisibility } from '@/post/model/Post';

/**
 * Parses an untrusted `visibility` value from a Supabase row into a
 * `PostVisibility`. Falls back to PUBLIC for unknown values rather than
 * letting the unknown string flow through as a typed value.
 *
 * Note: `(row.visibility as PostVisibility) || PUBLIC` does NOT achieve this —
 * any non-empty unknown string is truthy and would pass through.
 */
export function parsePostVisibility(raw: unknown): PostVisibility {
  if (raw === PostVisibility.PUBLIC || raw === PostVisibility.PRIVATE) {
    return raw;
  }
  return PostVisibility.PUBLIC;
}
