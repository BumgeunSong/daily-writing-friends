import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';

/**
 * Root redirect component
 * Handles the root path based on auth state
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
    return <Navigate to="/login" replace />;
  }
}