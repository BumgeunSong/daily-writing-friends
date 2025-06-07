import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';

/**
 * Loading component that matches PrivateRoutes styling
 */
function AuthLoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center space-y-4">
        <div className="size-12 animate-spin rounded-full border-b-2 border-gray-900" />
        <p className="text-lg font-medium text-gray-600">로딩 중...</p>
      </div>
    </div>
  );
}

/**
 * Router-level auth guard that shows loading state while auth is initializing
 * Also handles storing current path for redirect after login
 */
export function RouterAuthGuard() {
  const { loading, currentUser, setRedirectPathAfterLogin } = useAuth();
  const location = useLocation();

  // Store current path when user is not authenticated (for redirect after login)
  useEffect(() => {
    if (!loading && !currentUser && location.pathname !== '/login' && location.pathname !== '/join') {
      setRedirectPathAfterLogin(location.pathname);
    }
  }, [loading, currentUser, location.pathname, setRedirectPathAfterLogin]);

  // Show loading while Firebase Auth is initializing
  if (loading) {
    return <AuthLoadingSpinner />;
  }

  // Auth is initialized, render the matched route
  return <Outlet />;
}