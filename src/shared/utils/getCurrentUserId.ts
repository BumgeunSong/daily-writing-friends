/**
 * Safely get the current user ID from localStorage
 * This is used for error tracking when we need user context but don't have access to React context
 */
export function getCurrentUserIdFromStorage(): string | null {
  try {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.uid || null;
    }
  } catch (error) {
    console.error('Failed to parse stored user:', error);
  }
  return null;
}

/**
 * Get the current user's email from localStorage
 */
export function getCurrentUserEmailFromStorage(): string | null {
  try {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.email || null;
    }
  } catch (error) {
    console.error('Failed to parse stored user:', error);
  }
  return null;
}

/**
 * Get the full current user object from localStorage
 */
export function getCurrentUserFromStorage(): { uid: string; email?: string; displayName?: string } | null {
  try {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      };
    }
  } catch (error) {
    console.error('Failed to parse stored user:', error);
  }
  return null;
}