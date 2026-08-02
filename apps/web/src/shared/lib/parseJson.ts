import type { ZodType } from 'zod';

/**
 * Boundary reader for untrusted JSON strings (storage, URL, form data). This is
 * the one module where `JSON.parse` of such values is allowed (lint-enforced):
 * callers validate the parsed value against a zod schema instead of casting it
 * to a trusted type.
 */

/** Parse a JSON string into `unknown`. Returns undefined on null/empty/malformed input. */
export function parseJsonUnknown(raw: string | null | undefined): unknown {
  if (raw === null || raw === undefined || raw === '') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Parse a JSON string and validate it against `schema`. Returns undefined when
 * the input is malformed OR fails the schema — never a value cast to T unchecked.
 */
export function parseJson<T>(raw: string | null | undefined, schema: ZodType<T>): T | undefined {
  const result = schema.safeParse(parseJsonUnknown(raw));
  return result.success ? result.data : undefined;
}
