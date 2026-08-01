import type { AuthUser } from '@/shared/auth/authTypes';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse stored AuthUser from localStorage with shape validation. */
export function parseStoredAuthUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.uid !== 'string' || !UUID_RE.test(parsed.uid)) {
      return null;
    }
    return parsed as AuthUser;
  } catch {
    return null;
  }
}
