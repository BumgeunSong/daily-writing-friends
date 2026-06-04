import { STORAGE_KEYS, storage } from '@/shared/lib/storage';

interface StoredUser {
  uid: string;
  email?: string;
  displayName?: string;
}

function parseStoredUser(): StoredUser | null {
  const storedUser = storage.get(STORAGE_KEYS.CURRENT_USER);
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    return null;
  }
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
export function getCurrentUserFromStorage(): { uid: string; email?: string; displayName?: string } | null {
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