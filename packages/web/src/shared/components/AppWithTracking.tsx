import { Outlet } from 'react-router-dom';
import { useNavigationTracking } from '@/shared/hooks/useNavigationTracking';

/**
 * Root component wrapper that adds tracking capabilities
 */
export function AppWithTracking() {
  // Enable navigation tracking for all routes
  useNavigationTracking();

  return <Outlet />;
}