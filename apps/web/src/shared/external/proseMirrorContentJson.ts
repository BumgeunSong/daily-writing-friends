import { z } from 'zod';

import type { Json } from '@/shared/external/database.types';
import type { ProseMirrorDoc, ProseMirrorNode } from '@/shared/model/ProseMirror';

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
 * Trade-off: on malformed JSON, the caller falls back to rendering `content`
 * instead. This is preferred to letting the editor crash mid-render.
 */
export function parseContentJson(raw: unknown): ProseMirrorDoc | undefined {
  if (raw === null || raw === undefined) return undefined;
  const result = proseMirrorDocSchema.safeParse(raw);
  return result.success ? result.data : undefined;
}

/**
 * Write-side counterpart to {@link parseContentJson}: widens a ProseMirror
 * document to the jsonb `Json` column type. `ProseMirrorDoc` is an interface so
 * it lacks the index signature `Json` requires, but it is JSON-serializable in
 * practice. `Json` may only be imported inside `external/`, so write paths in
 * UI-layer modules route through this boundary helper.
 */
export function toContentJson(doc: ProseMirrorDoc): Json {
  return doc as unknown as Json;
}
