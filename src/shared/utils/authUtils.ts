import { User } from 'firebase/auth';
import { auth } from '@/firebase';

/**
 * Simple utility to get current user from Firebase Auth
 * This works with the useAuth context system - RouterAuthGuard ensures
 * this is only called after auth is initialized
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Require authentication for a route loader
 * Assumes RouterAuthGuard has already ensured auth is initialized
 */
export function requireAuthentication(): User {
  const user = getCurrentUser();
  
  if (!user) {
    // This shouldn't happen if RouterAuthGuard is working properly,
    // but provide fallback just in case
    const { redirect } = require('react-router-dom');
    throw redirect('/login');
  }
  
  return user;
}