import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Track whether we've already handled the post-login flow
  const hasHandledLoginRef = useRef(false);

  // After OAuth redirect returns, user will be set by onAuthStateChange.
  // Ensure user exists in users table, then navigate.
  // Only runs when login was initiated from this page (tracked via sessionStorage
  // to survive the OAuth page unload/reload cycle).
  useEffect(() => {
    if (!currentUser || isCheckingActiveStatus || hasHandledLoginRef.current) return;
    if (!sessionStorage.getItem('login_initiated')) return;
    hasHandledLoginRef.current = true;
    sessionStorage.removeItem('login_initiated');

    createUserIfNotExists(currentUser)
      .then(() => {
        const redirectPath = getLoginRedirectPath(isCurrentUserActive ?? false);
        navigate(redirectPath);
      })
      .catch((err) => {
        hasHandledLoginRef.current = false; // allow retry
        setError(err instanceof Error ? err : new Error('로그인 후 사용자 등록에 실패했습니다.'));
        setIsLoading(false);
      });
  }, [currentUser, isCurrentUserActive, isCheckingActiveStatus, navigate]);

  const handleLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      sessionStorage.setItem('login_initiated', 'true');
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
