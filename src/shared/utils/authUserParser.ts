export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StoredAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/** Parse stored AuthUser from localStorage with shape validation. */
export function parseStoredAuthUser(raw: string | null): StoredAuthUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.uid !== 'string' || !UUID_RE.test(parsed.uid)) {
      return null;
    }
    return parsed as StoredAuthUser;
  } catch {
    return null;
  }
}
