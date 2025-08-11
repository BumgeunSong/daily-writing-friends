import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '@/firebase';
import { useAuth } from '@/shared/hooks/useAuth';
import { useIsCurrentUserActive } from './useIsCurrentUserActive';

interface UseGoogleLoginWithRedirectReturn {
  handleLogin: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

const ACTIVE_USER_REDIRECT = '/boards';
const NEW_USER_REDIRECT = '/join/form';

export function useGoogleLoginWithRedirect(): UseGoogleLoginWithRedirectReturn {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [shouldCheckActiveStatus, setShouldCheckActiveStatus] = useState(false);
  
  const { currentUser } = useAuth();
  const { isCurrentUserActive } = useIsCurrentUserActive();

  // Handle navigation after login and active status check
  useEffect(() => {
    if (!shouldCheckActiveStatus || !currentUser || isCurrentUserActive === undefined) {
      return;
    }

    // Reset flags and navigate
    setShouldCheckActiveStatus(false);
    setIsLoading(false);
    
    const redirectPath = isCurrentUserActive ? ACTIVE_USER_REDIRECT : NEW_USER_REDIRECT;
    navigate(redirectPath);
  }, [shouldCheckActiveStatus, currentUser, isCurrentUserActive, navigate]);

  const handleLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await signInWithGoogle();
      
      // Trigger active status check after successful login
      setShouldCheckActiveStatus(true);
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