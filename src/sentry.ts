import * as Sentry from '@sentry/react';
import { isIndexedDbConnectionError } from '@/shared/lib/queryErrorTracking';

// Configuration constants
const SENTRY_CONFIG = {
  DSN: 'https://8909fb2b0ca421e67d747c29dc427694@o4508460976635904.ingest.us.sentry.io/4508460981747712',
  TRACE_SAMPLE_RATE: 0.1,
  REPLAY_SAMPLE_RATE: 0.1,
  REPLAY_ON_ERROR_RATE: 1.0,
} as const;

const IGNORED_ERRORS = [
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
] as const;

/**
 * Apply custom fingerprinting to group similar errors
 */
function applyCustomFingerprinting(event: Sentry.Event, error: Error): void {
  // Group iOS IndexedDB connection errors together
  // These are transient errors caused by iOS killing background connections
  if (isIndexedDbConnectionError(error)) {
    event.fingerprint = ['indexeddb', 'connection-lost'];
    event.level = 'warning';
    return;
  }

  // Group Firebase permission errors
  if (error.message?.includes('Missing or insufficient permissions')) {
    event.fingerprint = ['firebase', 'permission-denied'];
    return;
  }

  // Group Firebase auth errors by specific auth error type
  if (error.message?.includes('Firebase: Error')) {
    const authErrorType = error.message.match(/\(auth\/([^)]+)\)/)?.[1];
    if (authErrorType) {
      event.fingerprint = ['firebase-auth', authErrorType];
      return;
    }
  }

  // Group network timeout errors
  const isNetworkTimeout =
    error.message?.includes('timeout') ||
    error.message?.includes('Network request failed');

  if (isNetworkTimeout) {
    event.fingerprint = ['network', 'timeout'];
  }
}

/**
 * Remove sensitive data from error reports
 */
function sanitizeEvent(event: Sentry.Event): void {
  // Remove all cookie data
  if (event.request?.cookies) {
    delete event.request.cookies;
  }

  // Mask email local part while keeping domain for debugging
  if (event.user?.email) {
    const [, domain] = event.user.email.split('@');
    if (domain) {
      event.user.email = `***@${domain}`;
    }
  }
}

/**
 * Determine if error should be filtered out in development
 */
function shouldFilterInDevelopment(event: Sentry.Event, isDevelopment: boolean): boolean {
  return isDevelopment && event.exception?.values?.[0]?.type === 'NetworkError';
}

/**
 * Initialize Sentry with comprehensive error tracking configuration
 */
export const initSentry = (): void => {
  const isDevelopment = import.meta.env.DEV;
  const environment = isDevelopment ? 'development' : 'production';

  Sentry.init({
    dsn: SENTRY_CONFIG.DSN,
    environment,
    sendDefaultPii: false,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: SENTRY_CONFIG.TRACE_SAMPLE_RATE,
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/daily-writing-friends\.com\/api/,
    ],
    replaysSessionSampleRate: isDevelopment ? 0 : SENTRY_CONFIG.REPLAY_SAMPLE_RATE,
    replaysOnErrorSampleRate: SENTRY_CONFIG.REPLAY_ON_ERROR_RATE,
    ignoreErrors: [...IGNORED_ERRORS],

    beforeSend(event, hint) {
      // Filter out development network errors
      if (shouldFilterInDevelopment(event, isDevelopment)) {
        return null;
      }

      const error = hint.originalException;
      if (error instanceof Error) {
        applyCustomFingerprinting(event, error);
      }

      sanitizeEvent(event);

      return event;
    },
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
