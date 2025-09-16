import * as Sentry from '@sentry/react';
import { Query, Mutation } from '@tanstack/react-query';
import { FirebaseError } from 'firebase/app';
import { addSentryBreadcrumb, setSentryContext, setSentryTags } from '@/sentry';
import { trackFirebasePermissionError, getPermissionErrorHints } from '@/shared/utils/firebaseErrorTracking';
import { getCurrentUserIdFromStorage } from '@/shared/utils/getCurrentUserId';

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

  if (actualDuration && actualDuration > 3000) {
    // Track slow queries
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
  const queryKey = query.queryKey;
  const retryCount = query.state.fetchFailureCount || 0;
  const queryHash = query.queryHash;

  // Determine if this is a Firebase error
  const isFirebaseError = error instanceof FirebaseError ||
    (error instanceof Error && error.message?.includes('Firebase'));

  // Get query description for better context
  const queryDescription = getQueryKeyDescription(queryKey);

  // Add breadcrumb for the error
  addSentryBreadcrumb(
    `Query failed: ${queryDescription}`,
    'query-error',
    {
      queryKey,
      retryCount,
      errorMessage: error instanceof Error ? error.message : String(error),
    },
    'error'
  );

  // Set context for the error
  setSentryContext('queryError', {
    queryKey,
    queryHash,
    retryCount,
    queryDescription,
    userId: getCurrentUserIdFromStorage(),
    timestamp: new Date().toISOString(),
  });

  // Set tags for filtering
  setSentryTags({
    'query.key': queryDescription,
    'query.retryCount': String(retryCount),
    'error.source': 'react-query',
  });

  // Handle Firebase-specific errors
  if (isFirebaseError && error instanceof FirebaseError) {
    handleFirebaseQueryError(error, queryKey);
  } else {
    // Capture non-Firebase errors
    captureQueryError(error, queryKey, retryCount);
  }
}

/**
 * Track mutation errors
 */
export function trackMutationError(
  error: unknown,
  mutation: Mutation<unknown, unknown, unknown, unknown>
) {
  const mutationKey = mutation.options.mutationKey;
  const variables = mutation.state.variables;
  const mutationDescription = mutationKey ? getQueryKeyDescription(mutationKey) : 'Unknown mutation';

  addSentryBreadcrumb(
    `Mutation failed: ${mutationDescription}`,
    'mutation-error',
    {
      mutationKey,
      variables: variables ? '[Variables present]' : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    },
    'error'
  );

  setSentryContext('mutationError', {
    mutationKey,
    variables,
    mutationDescription,
    userId: getCurrentUserIdFromStorage(),
    timestamp: new Date().toISOString(),
  });

  setSentryTags({
    'mutation.key': mutationDescription,
    'error.source': 'react-query-mutation',
  });

  // Handle Firebase-specific errors
  if (error instanceof FirebaseError) {
    handleFirebaseMutationError(error, mutationKey, variables);
  } else {
    captureMutationError(error, mutationKey, variables);
  }
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
  // Common patterns in your app
  if (queryKey[0] === 'posts') {
    return { operation: 'read', path: `boards/${queryKey[1]}/posts` };
  }
  if (queryKey[0] === 'user') {
    return { operation: 'read', path: `users/${queryKey[1]}` };
  }
  if (queryKey[0] === 'comments') {
    return { operation: 'read', path: `boards/${queryKey[1]}/posts/${queryKey[2]}/comments` };
  }
  if (queryKey[0] === 'boards') {
    return { operation: 'read', path: 'boards' };
  }

  // Default
  return { operation: 'read', path: queryKey.join('/') };
}

/**
 * Get human-readable description of query key
 */
function getQueryKeyDescription(queryKey: unknown[]): string {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return 'Unknown query';
  }

  // Map common query keys to descriptions
  const firstKey = queryKey[0];

  if (firstKey === 'posts' && queryKey[1]) {
    return `Posts from board ${queryKey[1]}`;
  }
  if (firstKey === 'user' && queryKey[1]) {
    return `User ${queryKey[1]}`;
  }
  if (firstKey === 'comments') {
    return `Comments for post ${queryKey[2]}`;
  }
  if (firstKey === 'boards') {
    return 'Board list';
  }
  if (firstKey === 'notifications') {
    return 'User notifications';
  }
  if (firstKey === 'writingStats') {
    return `Writing stats for user ${queryKey[1]}`;
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
    if (duration > 5000) {
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