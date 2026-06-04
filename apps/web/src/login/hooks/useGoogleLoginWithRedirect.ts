import { useState, useCallback } from 'react';

import { signInWithGoogle } from '@/shared/auth/supabaseAuth';
import { SESSION_KEYS, sessionStore } from '@/shared/lib/storage';

interface UseGoogleLoginWithRedirectReturn {
  handleLogin: (returnTo?: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useGoogleLoginWithRedirect(): UseGoogleLoginWithRedirectReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleLogin = useCallback(async (returnTo?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      if (returnTo) {
        sessionStore.set(SESSION_KEYS.RETURN_TO, returnTo);
      }
      await signInWithGoogle();
      // User is redirected to Google — page unloads here.
      // On return, useAuth picks up the session via onAuthStateChange,
      // and RootRedirect reads SESSION_KEYS.RETURN_TO for navigation.
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Google login failed'));
      setIsLoading(false);
    }
  }, []);

  return {
    handleLogin,
    isLoading,
    error,
  };
}
