import { Outlet } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { SESSION_KEYS, sessionStore } from '@/shared/lib/storage';
import { Navigate, useLocation } from '@/shared/navigation';
import { resolvePrivateRoute } from '@/shared/utils/routingDecisions';

/**
 * Private route guard — thin shell over resolvePrivateRoute.
 */
export function PrivateRoutes() {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  const result = resolvePrivateRoute({ currentUser, loading, pathname: location.pathname });

  if (result.type === 'loading') return null;

  if (result.type === 'redirect') {
    if (result.returnToPath) {
      sessionStore.set(SESSION_KEYS.RETURN_TO, result.returnToPath);
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * Public route guard component  
 * Allows access to public routes for both authenticated and unauthenticated users
 * No redirects - public routes are accessible to everyone
 */
export function PublicRoutes() {
  // Public routes don't need any authentication checks
  // They are accessible to everyone (logged in or not)
  return <Outlet />;
}