import { useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';

/**
 * Private route guard component
 * Redirects immediately if loading or not authenticated
 * No loading spinner as per requirements
 */
export function PrivateRoutes() {
  const { currentUser, loading, setRedirectPathAfterLogin } = useAuth();
  const location = useLocation();


  useEffect(() => {
    // Store current path when user is not authenticated (only when not loading and user is null)
    if (!loading && !currentUser && location.pathname !== '/login') {
      setRedirectPathAfterLogin(location.pathname);
    }
  }, [loading, currentUser, location.pathname, setRedirectPathAfterLogin]);

  // Only redirect if auth has finished loading and user is not authenticated
  if (!loading && !currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If still loading, don't render anything (prevent flash of redirect)
  if (loading) {
    return null;
  }

  // User is authenticated, render the protected route
  return <Outlet />;
}

/**
 * Public route guard component  
 * Redirects authenticated users to their intended destination
 */
export function PublicRoutes() {
  const { currentUser, loading, redirectPathAfterLogin, setRedirectPathAfterLogin } = useAuth();

  // 상태 변경은 useEffect에서만!
  useEffect(() => {
    if (!loading && currentUser && redirectPathAfterLogin) {
      setRedirectPathAfterLogin(null);
    }
  }, [loading, currentUser, redirectPathAfterLogin, setRedirectPathAfterLogin]);

  if (!loading && currentUser) {
    const redirectTo = redirectPathAfterLogin || '/';
    return <Navigate to={redirectTo} replace />;
  }

  // User is not authenticated or still loading, render the public route
  return <Outlet />;
}