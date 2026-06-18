import { z } from 'zod';

import { type ProseMirrorDoc, type ProseMirrorNode, PostVisibility } from '@/post/model/Post';

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
