import * as Sentry from '@sentry/react';
import { addSentryBreadcrumb, setSentryContext } from '@/sentry';
import { getCurrentUserIdFromStorage } from '@/shared/utils/getCurrentUserId';

/**
 * Type-safe Network Information API
 */
interface NetworkInformation {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
}

interface NetworkErrorDetails {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  errorType: string;
  timestamp: number;
  userAgent: string;
  online: boolean;
  connection?: Partial<NetworkInformation>;
  userId?: string | null;
  duration?: number;
}

/**
 * Safely get network connection information with feature detection
 */
function getConnectionInfo(): Partial<NetworkInformation> | undefined {
  const nav = navigator as NavigatorWithConnection;

  if ('connection' in nav && nav.connection) {
    return {
      effectiveType: nav.connection.effectiveType,
      downlink: nav.connection.downlink,
      rtt: nav.connection.rtt,
      saveData: nav.connection.saveData,
    };
  }

  return undefined;
}

/**
 * Extract URL pattern for better error grouping
 */
function getUrlPattern(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname.includes('firebase')) {
      if (hostname.includes('firestore')) return 'firestore-api';
      if (hostname.includes('firebaselogging')) return 'firebase-logging';
      if (hostname.includes('firebaseremoteconfig')) return 'firebase-config';
      if (hostname.includes('firebaseauth')) return 'firebase-auth';
      if (hostname.includes('firebasestorage')) return 'firebase-storage';
      return 'firebase-other';
    }

    if (hostname.includes('googleapis.com')) {
      return 'google-apis';
    }

    return hostname;
  } catch {
    return 'invalid-url';
  }
}

/**
 * Determine Firebase service from URL
 */
function getFirebaseService(url: string): string {
  if (url.includes('firestore')) return 'Firestore';
  if (url.includes('auth')) return 'Authentication';
  if (url.includes('storage')) return 'Storage';
  if (url.includes('functions')) return 'Functions';
  if (url.includes('remoteconfig')) return 'Remote Config';
  if (url.includes('firebaselogging')) return 'Analytics/Logging';
  if (url.includes('firebaseinstallations')) return 'Installations';
  return 'Unknown Firebase Service';
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

  addSentryBreadcrumb(
    `Firebase error: ${firebaseContext.service} returned ${status}`,
    'firebase',
    firebaseContext,
    'error'
  );
}

/**
 * Track user actions for error context
 */
let lastUserAction: { action: string; target: string; timestamp: number } | null = null;

export function trackUserAction(action: string, target: string) {
  lastUserAction = {
    action,
    target,
    timestamp: Date.now(),
  };

  addSentryBreadcrumb(
    `User ${action}: ${target}`,
    'user',
    { action, target },
    'info'
  );
}

function getLastUserAction() {
  if (lastUserAction && Date.now() - lastUserAction.timestamp < 5000) {
    return lastUserAction;
  }
  return null;
}

/**
 * Custom fetch wrapper with error tracking
 * Use this instead of native fetch for tracked network requests
 */
export async function trackedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method || 'GET';
  const startTime = Date.now();

  addSentryBreadcrumb(
    `${method} ${url}`,
    'fetch',
    {
      url,
      method,
      body: init?.body ? '[Body Present]' : undefined,
    },
    'info'
  );

  try {
    const response = await fetch(input, init);
    const duration = Date.now() - startTime;

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
        userId: getCurrentUserIdFromStorage(),
        duration,
      };

      setSentryContext('networkError', errorDetails);

      if (url.includes('firebase') || url.includes('firestore')) {
        handleFirebaseError(url, response.status, response.statusText);
      }

      addSentryBreadcrumb(
        `${method} ${url} failed with ${response.status}`,
        'fetch',
        errorDetails,
        'error'
      );
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    const errorDetails: NetworkErrorDetails = {
      url,
      method,
      errorType: error instanceof TypeError ? error.message : 'Network Error',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      connection: getConnectionInfo(),
      userId: getCurrentUserIdFromStorage(),
      duration,
    };

    setSentryContext('networkError', errorDetails);

    const enhancedError = new Error(
      `Network request failed: ${method} ${url}\n` +
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
      `Online: ${navigator.onLine}\n` +
      `Duration: ${duration}ms`
    );
    enhancedError.name = 'NetworkError';

    Sentry.withScope((scope) => {
      scope.setFingerprint(['network-error', getUrlPattern(url), method]);
      scope.setLevel('error');
      scope.setTag('network.online', String(navigator.onLine));
      scope.setTag('network.url_pattern', getUrlPattern(url));
      scope.setTag('network.method', method);
      scope.setTag('network.duration', String(duration));

      const lastUserAction = getLastUserAction();
      if (lastUserAction) {
        scope.setContext('userAction', lastUserAction);
      }

      Sentry.captureException(enhancedError);
    });

    throw error;
  }
}

/**
 * Monitor connectivity changes
 */
export function setupConnectivityMonitoring() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    addSentryBreadcrumb('Network connection restored', 'network', { online: true }, 'info');
  });

  window.addEventListener('offline', () => {
    addSentryBreadcrumb('Network connection lost', 'network', { online: false }, 'warning');
    Sentry.captureMessage('User went offline', 'warning');
  });

  // Monitor connection changes if API is available
  const nav = navigator as NavigatorWithConnection;
  if ('connection' in nav && nav.connection) {
    const connection = nav.connection;

    if ('addEventListener' in connection) {
      (connection as any).addEventListener('change', () => {
        const info = getConnectionInfo();
        if (info) {
          addSentryBreadcrumb(
            'Network connection changed',
            'network',
            info,
            'info'
          );
        }
      });
    }
  }
}

/**
 * Create a tracked fetch instance with default options
 */
export function createTrackedFetch(defaultOptions?: RequestInit) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    return trackedFetch(input, { ...defaultOptions, ...init });
  };
}