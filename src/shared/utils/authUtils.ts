import { User } from 'firebase/auth';
import { auth } from '@/firebase';

/**
 * Get current user from Firebase Auth for use in loaders
 * Should only be called after auth guards have verified authentication
 */
export function getCurrentUser(): User {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated - ensure auth guards are properly configured');
  }
  
  return user;
}

/**
 * Wait for Firebase Auth to initialize (for use in loaders)
 * Returns the current user or null if not authenticated
 */
export function waitForAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}