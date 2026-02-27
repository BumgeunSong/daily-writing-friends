import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '@/shared/auth/supabaseAuth';
import { getLoginRedirectPath } from '@/login/utils/loginUtils';
import { useAuth } from '@/shared/hooks/useAuth';
import { useIsCurrentUserActive } from './useIsCurrentUserActive';
import { createUserIfNotExists } from '@/user/api/user';

interface UseGoogleLoginWithRedirectReturn {
  handleLogin: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useGoogleLoginWithRedirect(): UseGoogleLoginWithRedirectReturn {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { currentUser } = useAuth();
  const { isCurrentUserActive, isLoading: isCheckingActiveStatus } = useIsCurrentUserActive();

  // After OAuth redirect returns, user will be set by onAuthStateChange.
  // Ensure user exists in users table, then navigate.
  useEffect(() => {
    if (!currentUser || isCheckingActiveStatus) return;

    // Ensure the user exists in the users table
    createUserIfNotExists(currentUser).then(() => {
      const redirectPath = getLoginRedirectPath(isCurrentUserActive ?? false);
      navigate(redirectPath);
    });
  }, [currentUser, isCurrentUserActive, isCheckingActiveStatus, navigate]);

  const handleLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithGoogle();
      // User is redirected to Google — page unloads here.
      // On return, useAuth picks up the session automatically via onAuthStateChange.
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Google login failed');
      console.error('Error during Google sign-in:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  return {
    handleLogin,
    isLoading,
    error,
  };
}
