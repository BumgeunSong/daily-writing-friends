import { auth } from '@/firebase';
import { User } from 'firebase/auth';

/**
 * Wait for Firebase Auth to initialize (for use in loaders)
 * Returns the current user or null if not authenticated
 */
export function getCurrentUser(): Promise<User | null> {
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