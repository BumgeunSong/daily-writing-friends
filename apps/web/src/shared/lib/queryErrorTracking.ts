import * as Sentry from '@sentry/react';
import type { Query, Mutation } from '@tanstack/react-query';
import { addSentryBreadcrumb, setSentryContext, setSentryTags } from '@/sentry';
import { getCurrentUserIdFromStorage } from '@/shared/utils/getCurrentUserId';

// Performance tracking constants
const SLOW_QUERY_THRESHOLD = 3000; // 3 seconds
const VERY_SLOW_QUERY_THRESHOLD = 5000; // 5 seconds

/**
 * Extract a meaningful message from any error-like value.
 *
 * Supabase PostgrestError is a plain object with a `message` property
 * but is NOT an Error instance, so `String(error)` yields "[object Object]".
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (typeof message === 'object' && message !== null) return JSON.stringify(message);
    return String(message);
  }
  if (typeof error === 'object' && error !== null) {
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Detect iOS IndexedDB connection errors
 *
 * iOS Safari/WebKit aggressively kills IndexedDB connections when:
 * - App goes to background
 * - Memory pressure is high
 * - Tab is suspended
 *
 * These are transient errors that typically resolve on retry,
 * so we handle them gracefully without alarming error reports.
 */
export function isIndexedDbConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const isIndexedDbError = errorMessage.includes('indexeddb');
  const isConnectionLost =
    errorMessage.includes('connection') ||
    errorMessage.includes('transaction') ||
    errorMessage.includes('unavailable');

  return isIndexedDbError && isConnectionLost;
}

/**
 * Handle IndexedDB connection errors with minimal noise
 *
 * These errors are common on iOS and typically resolve automatically.
 * We track them at a lower severity and group them together to reduce alert fatigue.
 */
function handleIndexedDbConnectionError(
  _error: unknown,
  queryKey: unknown[],
  retryCount: number,
): void {
  const queryDescription = getQueryKeyDescription(queryKey);

  // Add a breadcrumb for debugging, but don't create a full error report
  addSentryBreadcrumb(
    `IndexedDB connection lost (retry ${retryCount}/3): ${queryDescription}`,
    'indexeddb',
    { queryKey, retryCount },
    'warning',
  );

  // Only report to Sentry after all retries have been exhausted
  // This reduces noise from transient errors that resolve on retry
  const allRetriesExhausted = retryCount >= 3;

  if (allRetriesExhausted) {
    Sentry.withScope((scope) => {
      // Group all IndexedDB connection errors together
      scope.setFingerprint(['indexeddb', 'connection-lost']);
      // Use 'warning' level since this is a known iOS limitation, not a bug
      scope.setLevel('warning');
      scope.setTag('error.type', 'indexeddb-connection');
      scope.setTag('platform.issue', 'ios-webkit-indexeddb');
      scope.setContext('indexedDb', {
        queryKey,
        queryDescription,
        retryCount,
        hint: 'iOS Safari/WebKit kills IndexedDB connections when app is backgrounded or under memory pressure. This is a known platform limitation.',
      });
      Sentry.captureMessage(
        `IndexedDB connection lost after ${retryCount} retries: ${queryDescription}`,
        'warning',
      );
    });
  }
}

// Query key description mappings
const QUERY_DESCRIPTIONS = {
  posts: (queryKey: unknown[]) => `Posts from board ${queryKey[1]}`,
  user: (queryKey: unknown[]) => `User ${queryKey[1]}`,
  comments: (queryKey: unknown[]) => `Comments for post ${queryKey[2]}`,
  boards: () => 'Board list',
  notifications: () => 'User notifications',
  writingStats: (queryKey: unknown[]) => `Writing stats for user ${queryKey[1]}`,
} as const;

/**
 * Performance tracking for queries
 */
const queryPerformance = new Map<string, number>();

/**
 * Track query lifecycle and performance
 */
export function trackQueryStart(queryKey: unknown[]) {
  const key = JSON.stringify(queryKey);
  queryPerformance.set(key, Date.now());

  addSentryBreadcrumb(
    `Query started: ${getQueryKeyDescription(queryKey)}`,
    'query',
    { queryKey },
    'info',
  );
}

/**
 * Track successful query completion
 */
export function trackQuerySuccess(queryKey: unknown[], duration?: number) {
  const key = JSON.stringify(queryKey);
  const startTime = queryPerformance.get(key);
  const actualDuration = duration || (startTime ? Date.now() - startTime : undefined);

  if (actualDuration && actualDuration > SLOW_QUERY_THRESHOLD) {
    addSentryBreadcrumb(
      `Slow query detected: ${getQueryKeyDescription(queryKey)}`,
      'performance',
      { queryKey, duration: actualDuration },
      'warning',
    );
  }

  queryPerformance.delete(key);
}

/**
 * Strip PII from query keys before they are recorded into Sentry.
 *
 * Some React Query keys embed user-supplied strings (e.g. the user post
 * search keyword). Those values must never reach Sentry context, breadcrumbs,
 * tags, or fingerprints. This helper runs once at the top of `trackQueryError`
 * so every downstream tracker sees the redacted key.
 *
 * Add new entries here as new PII-bearing queries are introduced.
 */
const REDACTED_QUERY_KEY_PREFIXES: ReadonlySet<string> = new Set(['userPostSearch']);

function redactQueryKey(queryKey: readonly unknown[]): unknown[] {
  if (typeof queryKey[0] !== 'string' || !REDACTED_QUERY_KEY_PREFIXES.has(queryKey[0])) {
    return [...queryKey];
  }
  // Keep the prefix and the scoping id (e.g. userId at index 1); replace any
  // user-supplied values at index >= 2 with a constant marker.
  return queryKey.map((part, i) => (i >= 2 ? '[redacted]' : part));
}

/**
 * Enhanced error tracking for React Query operations
 */
export function trackQueryError(
  error: unknown,
  query: Query<unknown, unknown, unknown, unknown[]>,
) {
  const {
    queryKey: rawQueryKey,
    state: { fetchFailureCount = 0 },
    queryHash,
  } = query;
  const queryKey = redactQueryKey(rawQueryKey);
  const queryDescription = getQueryKeyDescription(queryKey);

  // Handle iOS IndexedDB connection errors gracefully
  // These are transient errors caused by iOS killing background connections
  if (isIndexedDbConnectionError(error)) {
    handleIndexedDbConnectionError(error, queryKey, fetchFailureCount);
    return;
  }

  // Add error context and breadcrumb
  addErrorContext({
    type: 'query',
    key: queryKey,
    description: queryDescription,
    retryCount: fetchFailureCount,
    queryHash,
    error,
  });

  captureQueryError(error, queryKey, fetchFailureCount);
}

/**
 * Track mutation errors
 */
export function trackMutationError(
  error: unknown,
  mutation: Mutation<unknown, unknown, unknown, unknown>,
) {
  const {
    options: { mutationKey },
    state: { variables },
  } = mutation;
  const mutationDescription = mutationKey
    ? getQueryKeyDescription(mutationKey)
    : 'Unknown mutation';

  // Add error context and breadcrumb
  addErrorContext({
    type: 'mutation',
    key: mutationKey,
    description: mutationDescription,
    variables,
    error,
  });

  captureMutationError(error, mutationKey, variables);
}

/**
 * Add common error context and breadcrumb
 */
function addErrorContext(params: {
  type: 'query' | 'mutation';
  key: unknown[] | undefined;
  description: string;
  error: unknown;
  retryCount?: number;
  queryHash?: string;
  variables?: unknown;
}): void {
  const { type, key, description, error, retryCount, queryHash, variables } = params;

  // Add breadcrumb
  addSentryBreadcrumb(
    `${type === 'query' ? 'Query' : 'Mutation'} failed: ${description}`,
    `${type}-error`,
    {
      [`${type}Key`]: key,
      ...(retryCount !== undefined && { retryCount }),
      ...(variables !== undefined && { variables: variables ? '[Variables present]' : undefined }),
      errorMessage: getErrorMessage(error),
    },
    'error',
  );

  // Set context
  setSentryContext(`${type}Error`, {
    [`${type}Key`]: key,
    [`${type}Description`]: description,
    ...(retryCount !== undefined && { retryCount }),
    ...(queryHash && { queryHash }),
    ...(variables !== undefined && { variables }),
    userId: getCurrentUserIdFromStorage(),
    timestamp: new Date().toISOString(),
  });

  // Set tags
  setSentryTags({
    [`${type}.key`]: description,
    ...(retryCount !== undefined && { [`${type}.retryCount`]: String(retryCount) }),
    'error.source': type === 'query' ? 'react-query' : 'react-query-mutation',
  });
}

/**
 * Capture non-Firebase query errors
 */
function captureQueryError(error: unknown, queryKey: unknown[], retryCount: number) {
  const enhancedError = error instanceof Error ? error : new Error(getErrorMessage(error));

  Sentry.withScope((scope) => {
    scope.setFingerprint(['query-error', getQueryKeyDescription(queryKey)]);
    scope.setLevel(retryCount >= 3 ? 'error' : 'warning');
    scope.setContext('query', {
      queryKey,
      retryCount,
      description: getQueryKeyDescription(queryKey),
    });
    Sentry.captureException(enhancedError);
  });
}

/**
 * Capture non-Firebase mutation errors
 */
function captureMutationError(
  error: unknown,
  mutationKey: unknown[] | undefined,
  variables: unknown,
) {
  const enhancedError = error instanceof Error ? error : new Error(getErrorMessage(error));

  Sentry.withScope((scope) => {
    scope.setFingerprint([
      'mutation-error',
      mutationKey ? getQueryKeyDescription(mutationKey) : 'unknown',
    ]);
    scope.setLevel('error');
    scope.setContext('mutation', {
      mutationKey,
      variables: variables ? '[Variables logged]' : undefined,
      description: mutationKey ? getQueryKeyDescription(mutationKey) : 'Unknown mutation',
    });
    Sentry.captureException(enhancedError);
  });
}

/**
 * Get human-readable description of query key
 */
function getQueryKeyDescription(queryKey: unknown[]): string {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return 'Unknown query';
  }

  const firstKey = queryKey[0] as keyof typeof QUERY_DESCRIPTIONS;
  const descriptionFn = QUERY_DESCRIPTIONS[firstKey];

  if (descriptionFn) {
    return descriptionFn(queryKey);
  }

  // Default: join with dots
  return queryKey.map((k) => String(k)).join('.');
}

/**
 * Monitor query performance and detect patterns
 */
export function getQueryPerformanceStats() {
  const slowQueries: Array<{ queryKey: string; duration: number }> = [];

  queryPerformance.forEach((startTime, queryKey) => {
    const duration = Date.now() - startTime;
    if (duration > VERY_SLOW_QUERY_THRESHOLD) {
      slowQueries.push({
        queryKey,
        duration,
      });
    }
  });

  return {
    activeQueries: queryPerformance.size,
    slowQueries,
  };
}
