import { z } from 'zod';

import type { AuthUser } from '@/shared/auth/authTypes';
import { parseJson } from '@/shared/lib/parseJson';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const authUserSchema: z.ZodType<AuthUser> = z.object({
  uid: z.string().regex(UUID_RE),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  photoURL: z.string().nullable(),
});

/** Parse stored AuthUser from localStorage with full shape validation. */
export function parseStoredAuthUser(raw: string | null): AuthUser | null {
  return parseJson(raw, authUserSchema) ?? null;
}
