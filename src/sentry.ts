import * as Sentry from '@sentry/react';

export const initSentry = () => {
  const isDevelopment = import.meta.env.DEV;
  const environment = isDevelopment ? 'development' : 'production';

  Sentry.init({
    dsn: 'https://8909fb2b0ca421e67d747c29dc427694@o4508460976635904.ingest.us.sentry.io/4508460981747712',
    environment,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    tracePropagationTargets: ['localhost', /^https:\/\/daily-writing-friends\.com\/api/],
    replaysSessionSampleRate: isDevelopment ? 0 : 0.1,
    replaysOnErrorSampleRate: 1.0,

    beforeSend(event, hint) {
      if (isDevelopment && event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }

      // Add custom fingerprinting for Firebase errors
      const error = hint.originalException;
      if (error && error instanceof Error) {
        // Group Firebase permission errors together
        if (error.message?.includes('Missing or insufficient permissions')) {
          event.fingerprint = ['firebase', 'permission-denied'];
        }
        // Group Firebase auth errors
        else if (error.message?.includes('Firebase: Error')) {
          const authErrorType = error.message.match(/\(auth\/([^)]+)\)/)?.[1];
          if (authErrorType) {
            event.fingerprint = ['firebase-auth', authErrorType];
          }
        }
        // Group network timeout errors
        else if (
          error.message?.includes('timeout') ||
          error.message?.includes('Network request failed')
        ) {
          event.fingerprint = ['network', 'timeout'];
        }
      }

      // Sanitize sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      if (event.user?.email) {
        // Keep email domain but hide local part for privacy
        const [, domain] = event.user.email.split('@');
        if (domain) {
          event.user.email = `***@${domain}`;
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'chrome-extension://',
      'moz-extension://',
      // Common browser errors
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors that are expected
      'NetworkError',
      'Failed to fetch',
      // User-initiated cancellations
      'AbortError',
    ],
  });
};

/**
 * Set user context for Sentry error tracking
 */
export const setSentryUser = (
  user: { uid: string; email?: string | null; displayName?: string | null } | null,
) => {
  if (user) {
    Sentry.setUser({
      id: user.uid,
      email: user.email || undefined,
      username: user.displayName || undefined,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb for user actions
 */
export const addSentryBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info',
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Set context for current feature/page
 */
export const setSentryContext = (key: string, context: Record<string, any>) => {
  Sentry.setContext(key, context);
};

/**
 * Set tags for filtering and searching
 */
export const setSentryTags = (tags: Record<string, string>) => {
  Sentry.setTags(tags);
};
