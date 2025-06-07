import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';

/**
 * Root redirect component
 * Handles the root path based on auth state
 * Unauthenticated users go to JoinIntroPage (official landing page)
 */
export function RootRedirect() {
  const { currentUser, loading } = useAuth();

  // If still loading, don't render anything
  if (loading) {
    return null;
  }

  // Redirect based on auth state
  if (currentUser) {
    return <Navigate to="/boards" replace />;
  } else {
    // Root path goes to join page (official landing page)
    return <Navigate to="/join" replace />;
  }
}