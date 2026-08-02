import { z } from 'zod';

import { STORAGE_KEYS, storage } from '@/shared/lib/storage';
import { parseJson } from '@/shared/lib/parseJson';

// email/displayName are stored as `null` (not absent) when the user lacks them,
// so .nullish() — .optional() alone would reject the null and drop the whole user.
const storedUserSchema = z.object({
  uid: z.string(),
  email: z.string().nullish(),
  displayName: z.string().nullish(),
});
type StoredUser = z.infer<typeof storedUserSchema>;

function parseStoredUser(): StoredUser | null {
  return parseJson(storage.get(STORAGE_KEYS.CURRENT_USER), storedUserSchema) ?? null;
}

/**
 * Safely get the current user ID from localStorage
 * This is used for error tracking when we need user context but don't have access to React context
 */
export function getCurrentUserIdFromStorage(): string | null {
  const user = parseStoredUser();
  return user?.uid || null;
}

/**
 * Get the current user's email from localStorage
 */
export function getCurrentUserEmailFromStorage(): string | null {
  const user = parseStoredUser();
  return user?.email || null;
}

/**
 * Get the full current user object from localStorage
 */
export function getCurrentUserFromStorage(): StoredUser | null {
  const user = parseStoredUser();
  if (user?.uid) {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    };
  }
  return null;
}