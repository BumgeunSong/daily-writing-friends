import * as Sentry from '@sentry/react';
import { addSentryBreadcrumb, setSentryContext } from '@/sentry';
import { getCurrentUserIdFromStorage } from '@/shared/utils/getCurrentUserId';

interface NetworkErrorDetails {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  errorType: string;
  timestamp: number;
  userAgent: string;
  online: boolean;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

/**
 * Enhanced fetch wrapper that provides better error tracking
 */
export function setupNetworkErrorTracking() {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource.url;
    const method = config?.method || 'GET';
    const startTime = Date.now();

    // Add breadcrumb for the fetch attempt
    addSentryBreadcrumb(
      `${method} ${url}`,
      'fetch',
      {
        url,
        method,
        body: config?.body ? '[Body Present]' : undefined,
      },
      'info'
    );

    try {
      const response = await originalFetch.apply(this, args);

      // Track failed responses
      if (!response.ok) {
        const errorDetails: NetworkErrorDetails = {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          errorType: 'HTTP Error',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          online: navigator.onLine,
          connection: getConnectionInfo(),
        };

        // Add context for debugging
        setSentryContext('networkError', errorDetails);

        // Log specific Firebase errors with more context
        if (url.includes('firebase') || url.includes('firestore')) {
          handleFirebaseError(url, response.status, response.statusText);
        }
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Capture detailed network error information
      const errorDetails: NetworkErrorDetails = {
        url,
        method,
        errorType: error instanceof TypeError ? error.message : 'Network Error',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        connection: getConnectionInfo(),
      };

      // Add rich context to Sentry
      setSentryContext('networkError', {
        ...errorDetails,
        duration,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        userId: getCurrentUserIdFromStorage(),
      });

      // Create a more descriptive error
      const enhancedError = new Error(
        `Network request failed: ${method} ${url}\n` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
        `Online: ${navigator.onLine}\n` +
        `Duration: ${duration}ms`
      );
      enhancedError.name = 'NetworkError';

      // Add fingerprint based on the URL pattern
      Sentry.withScope((scope) => {
        scope.setFingerprint(['network-error', getUrlPattern(url), method]);
        scope.setLevel('error');
        scope.setTag('network.online', String(navigator.onLine));
        scope.setTag('network.url_pattern', getUrlPattern(url));
        scope.setTag('network.method', method);
        scope.setTag('network.duration', String(duration));

        // Add user action context
        const lastUserAction = getLastUserAction();
        if (lastUserAction) {
          scope.setContext('userAction', lastUserAction);
        }

        Sentry.captureException(enhancedError);
      });

      throw error;
    }
  };
}

/**
 * Get connection information if available
 */
function getConnectionInfo() {
  const connection = (navigator as any).connection ||
                     (navigator as any).mozConnection ||
                     (navigator as any).webkitConnection;

  if (connection) {
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    };
  }

  return undefined;
}

/**
 * Extract URL pattern for better grouping
 */
function getUrlPattern(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Group Firebase URLs
    if (hostname.includes('firebase')) {
      if (hostname.includes('firestore')) return 'firestore-api';
      if (hostname.includes('firebaselogging')) return 'firebase-logging';
      if (hostname.includes('firebaseremoteconfig')) return 'firebase-config';
      return 'firebase-other';
    }

    // Group Google APIs
    if (hostname.includes('googleapis.com')) {
      return 'google-apis';
    }

    // Return domain for others
    return hostname;
  } catch {
    return 'invalid-url';
  }
}

/**
 * Handle Firebase-specific errors with additional context
 */
function handleFirebaseError(url: string, status: number, statusText: string) {
  const firebaseContext = {
    service: getFirebaseService(url),
    status,
    statusText,
    timestamp: new Date().toISOString(),
  };

  setSentryContext('firebaseError', firebaseContext);

  // Add specific breadcrumb for Firebase errors
  addSentryBreadcrumb(
    `Firebase error: ${firebaseContext.service} returned ${status}`,
    'firebase',
    firebaseContext,
    'error'
  );
}

/**
 * Determine which Firebase service from URL
 */
function getFirebaseService(url: string): string {
  if (url.includes('firestore')) return 'Firestore';
  if (url.includes('auth')) return 'Authentication';
  if (url.includes('storage')) return 'Storage';
  if (url.includes('functions')) return 'Functions';
  if (url.includes('remoteconfig')) return 'Remote Config';
  if (url.includes('firebaselogging')) return 'Analytics/Logging';
  return 'Unknown Firebase Service';
}

/**
 * Track user actions for context
 */
let lastUserAction: { action: string; target: string; timestamp: number } | null = null;

export function trackUserAction(action: string, target: string) {
  lastUserAction = {
    action,
    target,
    timestamp: Date.now(),
  };

  // Add breadcrumb for user action
  addSentryBreadcrumb(
    `User ${action}: ${target}`,
    'user',
    { action, target },
    'info'
  );
}

function getLastUserAction() {
  // Only return if action was within last 5 seconds
  if (lastUserAction && Date.now() - lastUserAction.timestamp < 5000) {
    return lastUserAction;
  }
  return null;
}

/**
 * Monitor online/offline status changes
 */
export function setupConnectivityMonitoring() {
  window.addEventListener('online', () => {
    addSentryBreadcrumb('Network connection restored', 'network', { online: true }, 'info');
  });

  window.addEventListener('offline', () => {
    addSentryBreadcrumb('Network connection lost', 'network', { online: false }, 'warning');

    Sentry.captureMessage('User went offline', 'warning');
  });
}