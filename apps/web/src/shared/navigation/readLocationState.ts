import type { ZodType } from 'zod';

/**
 * Validate an untrusted React Router `location.state` (an arbitrary value the
 * navigator passed) against a zod schema. Returns undefined when the state is
 * missing or fails the schema — callers fall back to their own default instead
 * of casting an unknown to a trusted type.
 */
export function readLocationState<T>(state: unknown, schema: ZodType<T>): T | undefined {
  const result = schema.safeParse(state);
  return result.success ? result.data : undefined;
}
