import * as Sentry from '@sentry/react';
import { Query, Mutation } from '@tanstack/react-query';
import { FirebaseError } from 'firebase/app';
import { addSentryBreadcrumb, setSentryContext, setSentryTags } from '@/sentry';
import { trackFirebasePermissionError, getPermissionErrorHints } from '@/shared/utils/firebaseErrorTracking';
import { getCurrentUserIdFromStorage } from '@/shared/utils/getCurrentUserId';

// Performance tracking constants
const SLOW_QUERY_THRESHOLD = 3000; // 3 seconds
const VERY_SLOW_QUERY_THRESHOLD = 5000; // 5 seconds

// Query key to Firebase path mappings
const QUERY_KEY_PATTERNS = {
  posts: (queryKey: unknown[]) => ({ operation: 'read' as const, path: `boards/${queryKey[1]}/posts` }),
  user: (queryKey: unknown[]) => ({ operation: 'read' as const, path: `users/${queryKey[1]}` }),
  comments: (queryKey: unknown[]) => ({ operation: 'read' as const, path: `boards/${queryKey[1]}/posts/${queryKey[2]}/comments` }),
  boards: () => ({ operation: 'read' as const, path: 'boards' }),
} as const;

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
    'info'
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
      'warning'
    );
  }

  queryPerformance.delete(key);
}

/**
 * Enhanced error tracking for React Query operations
 */
export function trackQueryError(
  error: unknown,
  query: Query<unknown, unknown, unknown, unknown[]>
) {
  const { queryKey, state: { fetchFailureCount = 0 }, queryHash } = query;
  const queryDescription = getQueryKeyDescription(queryKey);

  // Add error context and breadcrumb
  addErrorContext({
    type: 'query',
    key: queryKey,
    description: queryDescription,
    retryCount: fetchFailureCount,
    queryHash,
    error,
  });

  // Route to appropriate error handler
  if (isFirebaseError(error)) {
    handleFirebaseQueryError(error as FirebaseError, queryKey);
  } else {
    captureQueryError(error, queryKey, fetchFailureCount);
  }
}

/**
 * Track mutation errors
 */
export function trackMutationError(
  error: unknown,
  mutation: Mutation<unknown, unknown, unknown, unknown>
) {
  const { options: { mutationKey }, state: { variables } } = mutation;
  const mutationDescription = mutationKey ? getQueryKeyDescription(mutationKey) : 'Unknown mutation';

  // Add error context and breadcrumb
  addErrorContext({
    type: 'mutation',
    key: mutationKey,
    description: mutationDescription,
    variables,
    error,
  });

  // Route to appropriate error handler
  if (error instanceof FirebaseError) {
    handleFirebaseMutationError(error, mutationKey, variables);
  } else {
    captureMutationError(error, mutationKey, variables);
  }
}

/**
 * Check if error is Firebase-related
 */
function isFirebaseError(error: unknown): boolean {
  return error instanceof FirebaseError ||
    (error instanceof Error && error.message?.includes('Firebase'));
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
      errorMessage: error instanceof Error ? error.message : String(error),
    },
    'error'
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
 * Handle Firebase-specific query errors
 */
function handleFirebaseQueryError(error: FirebaseError, queryKey: unknown[]) {
  // Determine the operation and path from query key
  const { operation, path } = parseQueryKeyForFirebase(queryKey);

  if (error.code === 'permission-denied') {
    trackFirebasePermissionError(error, {
      operation,
      path,
      userId: getCurrentUserIdFromStorage(),
      additionalInfo: {
        source: 'react-query',
        queryKey,
      },
    });

    // Get and log permission hints
    const collection = path.split('/')[0];
    const hints = getPermissionErrorHints(collection, operation);
    if (hints) {
      console.error('Permission Error Debug Info:', {
        queryKey,
        ...hints,
      });
    }
  } else {
    // Other Firebase errors
    Sentry.withScope((scope) => {
      scope.setFingerprint(['firebase-error', error.code, getQueryKeyDescription(queryKey)]);
      scope.setLevel('error');
      scope.setTag('firebase.code', error.code);
      scope.setTag('firebase.service', getFirebaseServiceFromError(error));
      Sentry.captureException(error);
    });
  }
}

/**
 * Handle Firebase-specific mutation errors
 */
function handleFirebaseMutationError(error: FirebaseError, mutationKey: unknown[] | undefined, variables: unknown) {
  const { operation, path } = mutationKey
    ? parseQueryKeyForFirebase(mutationKey)
    : { operation: 'write' as const, path: 'unknown' };

  if (error.code === 'permission-denied') {
    trackFirebasePermissionError(error, {
      operation,
      path,
      userId: getCurrentUserIdFromStorage(),
      additionalInfo: {
        source: 'react-query-mutation',
        mutationKey,
        variables: variables ? '[Variables present]' : undefined,
      },
    });
  } else {
    Sentry.withScope((scope) => {
      scope.setFingerprint(['firebase-mutation-error', error.code]);
      scope.setLevel('error');
      scope.setTag('firebase.code', error.code);
      Sentry.captureException(error);
    });
  }
}

/**
 * Capture non-Firebase query errors
 */
function captureQueryError(error: unknown, queryKey: unknown[], retryCount: number) {
  const enhancedError = error instanceof Error ? error : new Error(String(error));

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
function captureMutationError(error: unknown, mutationKey: unknown[] | undefined, variables: unknown) {
  const enhancedError = error instanceof Error ? error : new Error(String(error));

  Sentry.withScope((scope) => {
    scope.setFingerprint(['mutation-error', mutationKey ? getQueryKeyDescription(mutationKey) : 'unknown']);
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
 * Parse query key to determine Firebase operation and path
 */
function parseQueryKeyForFirebase(queryKey: unknown[]): { operation: 'read' | 'write', path: string } {
  const firstKey = queryKey[0] as keyof typeof QUERY_KEY_PATTERNS;
  const pattern = QUERY_KEY_PATTERNS[firstKey];

  if (pattern) {
    return pattern(queryKey);
  }

  // Default fallback
  return { operation: 'read', path: queryKey.join('/') };
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
  return queryKey.map(k => String(k)).join('.');
}

/**
 * Determine Firebase service from error
 */
function getFirebaseServiceFromError(error: FirebaseError): string {
  if (error.code?.includes('auth')) return 'Authentication';
  if (error.code?.includes('firestore')) return 'Firestore';
  if (error.code?.includes('storage')) return 'Storage';
  if (error.code?.includes('functions')) return 'Functions';
  return 'Unknown Firebase Service';
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