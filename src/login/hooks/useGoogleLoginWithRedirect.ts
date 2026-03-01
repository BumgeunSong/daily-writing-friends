import { useState, useCallback } from 'react';
import { signInWithGoogle } from '@/shared/auth/supabaseAuth';

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
        sessionStorage.setItem('returnTo', returnTo);
      }
      await signInWithGoogle();
      // User is redirected to Google — page unloads here.
      // On return, useAuth picks up the session via onAuthStateChange,
      // and RootRedirect reads sessionStorage('returnTo') for navigation.
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
