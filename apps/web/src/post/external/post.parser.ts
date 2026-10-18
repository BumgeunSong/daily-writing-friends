import * as Sentry from '@sentry/react';

import { PostVisibility } from '@/post/model/Post';

/**
 * Parses an untrusted `visibility` value from a Supabase row into a
 * `PostVisibility`.
 *
 * Failure classification: **degrade-closed** (#698 convention v4). Visibility is
 * an access-control field, so an unknown value fails closed to PRIVATE. A post
 * that should be visible being hidden is recoverable; a post that should be
 * hidden leaking to the public is not. The unknown value is reported to Sentry
 * so the degrade is never silent (Tenet XIII).
 *
 * Note: `(row.visibility as PostVisibility) || PRIVATE` does NOT achieve this —
 * any non-empty unknown string is truthy and would pass through.
 */
export function parsePostVisibility(raw: unknown): PostVisibility {
  if (raw === PostVisibility.PUBLIC || raw === PostVisibility.PRIVATE) {
    return raw;
  }
  Sentry.captureMessage('Unknown post visibility value', {
    level: 'warning',
    extra: { raw },
  });
  return PostVisibility.PRIVATE;
}
