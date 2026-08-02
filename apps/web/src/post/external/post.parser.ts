import * as Sentry from '@sentry/react';
import { z } from 'zod';

import type { Json } from '@/shared/external/database.types';
import { type ProseMirrorDoc, type ProseMirrorNode, PostVisibility } from '@/post/model/Post';

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

const proseMirrorMarkSchema = z.object({
  type: z.string(),
  attrs: z.record(z.unknown()).optional(),
});

const proseMirrorNodeSchema: z.ZodType<ProseMirrorNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    attrs: z.record(z.unknown()).optional(),
    content: z.array(proseMirrorNodeSchema).optional(),
    marks: z.array(proseMirrorMarkSchema).optional(),
    text: z.string().optional(),
  }),
);

const proseMirrorDocSchema = z.object({
  type: z.literal('doc'),
  content: z.array(proseMirrorNodeSchema).optional(),
});

/**
 * Parses an untrusted `content_json` value from a Supabase row into a
 * `ProseMirrorDoc`. Returns `undefined` for null/undefined OR for any value
 * that does not match the ProseMirror document shape — never returns a
 * structurally invalid doc cast to the strong type.
 *
 * Trade-off: on malformed JSON, the editor falls back to rendering `content`
 * instead. This is preferred to letting the editor crash mid-render.
 */
export function parsePostContentJson(raw: unknown): ProseMirrorDoc | undefined {
  if (raw === null || raw === undefined) return undefined;
  const result = proseMirrorDocSchema.safeParse(raw);
  return result.success ? result.data : undefined;
}

/**
 * Write-side counterpart to {@link parsePostContentJson}: widens a ProseMirror
 * document to the jsonb `Json` column type. `ProseMirrorDoc` is an interface so
 * it lacks the index signature `Json` requires, but it is JSON-serializable in
 * practice. `Json` may only be imported inside `external/`, so write paths in
 * UI-layer modules route through this boundary helper.
 */
export function toContentJson(doc: ProseMirrorDoc): Json {
  return doc as unknown as Json;
}
