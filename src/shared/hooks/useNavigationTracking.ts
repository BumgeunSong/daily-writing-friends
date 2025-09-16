import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { addSentryBreadcrumb, setSentryContext } from '@/sentry';
import { trackUserAction } from '@/shared/utils/trackedFetch';

/**
 * Hook to track navigation for better error context
 */
export function useNavigationTracking() {
  const location = useLocation();

  useEffect(() => {
    // Track page navigation
    const pageName = getPageName(location.pathname);

    addSentryBreadcrumb(
      `Navigated to ${pageName}`,
      'navigation',
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      'info'
    );

    // Set context for current page
    setSentryContext('navigation', {
      currentPage: pageName,
      pathname: location.pathname,
      search: location.search,
    });

    // Track as user action for network error context
    trackUserAction('navigate', pageName);
  }, [location]);

  // Track clicks on interactive elements
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Track button clicks
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.closest('button');
        const buttonText = button?.textContent?.trim() || 'Unknown Button';
        trackUserAction('click', `Button: ${buttonText}`);
      }

      // Track link clicks
      if (target.tagName === 'A' || target.closest('a')) {
        const link = target.closest('a');
        const linkText = link?.textContent?.trim() || link?.href || 'Unknown Link';
        trackUserAction('click', `Link: ${linkText}`);
      }

      // Track form submissions
      if (target.tagName === 'FORM' || target.closest('form')) {
        const form = target.closest('form');
        const formId = form?.id || form?.className || 'Unknown Form';
        trackUserAction('submit', `Form: ${formId}`);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
}

/**
 * Extract page name from pathname
 */
function getPageName(pathname: string): string {
  if (pathname === '/') return 'Home';
  if (pathname.startsWith('/boards/')) {
    const segments = pathname.split('/');
    if (segments[3] === 'posts' && segments[4]) {
      if (segments[5] === 'edit') return 'Post Edit';
      return 'Post Detail';
    }
    return 'Board';
  }
  if (pathname.startsWith('/users/')) return 'User Profile';
  if (pathname === '/login') return 'Login';
  if (pathname === '/signup') return 'Signup';
  if (pathname === '/notifications') return 'Notifications';
  if (pathname === '/topics') return 'Topics';

  // Default to last segment
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'Unknown';
}