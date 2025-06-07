import { User } from 'firebase/auth';
import { auth } from '@/firebase';

/**
 * Promise that resolves when Firebase Auth state is initialized
 * This is essential for React Router data API loaders to work correctly
 */
export function waitForAuthInitialization(): Promise<User | null> {
  return new Promise((resolve) => {
    // If auth is already initialized and we have a user, resolve immediately
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    // Wait for Firebase to restore auth state from persistence
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe(); // Clean up the listener
      resolve(user);
    });
  });
}

/**
 * Get current authenticated user, waiting for auth initialization if needed
 * Use this in router loaders instead of auth.currentUser
 */
export async function getCurrentAuthenticatedUser(): Promise<User | null> {
  return await waitForAuthInitialization();
}

/**
 * Require authentication for a route loader
 * Throws redirect response if user is not authenticated
 */
export async function requireAuthentication(): Promise<User> {
  const user = await getCurrentAuthenticatedUser();
  
  if (!user) {
    // Import redirect dynamically to avoid circular dependencies
    const { redirect } = await import('react-router-dom');
    throw redirect('/login');
  }
  
  return user;
}