import * as Sentry from '@sentry/react';
import { FirebaseError } from 'firebase/app';
import { setSentryContext, addSentryBreadcrumb } from '@/sentry';
import { getCurrentUserIdFromStorage } from '@/shared/utils/getCurrentUserId';

interface FirebasePermissionContext {
  operation: 'read' | 'write' | 'create' | 'update' | 'delete';
  collection: string;
  documentId?: string;
  subcollection?: string;
  userId?: string;
  timestamp: string;
  authState: {
    isAuthenticated: boolean;
    userId?: string;
    email?: string;
  };
  additionalInfo?: Record<string, any>;
}

/**
 * Extract detailed information from Firebase permission errors
 */
export function trackFirebasePermissionError(
  error: FirebaseError,
  context: {
    operation: FirebasePermissionContext['operation'];
    path: string;
    userId?: string;
    additionalInfo?: Record<string, any>;
  }
) {
  if (error.code !== 'permission-denied') {
    return;
  }

  // Parse the path to understand what was being accessed
  const pathParts = context.path.split('/').filter(Boolean);

  const permissionContext: FirebasePermissionContext = {
    operation: context.operation,
    collection: pathParts[0] || 'unknown',
    documentId: pathParts[1],
    subcollection: pathParts[2],
    userId: context.userId,
    timestamp: new Date().toISOString(),
    authState: {
      isAuthenticated: !!context.userId,
      userId: context.userId,
    },
    additionalInfo: context.additionalInfo,
  };

  // Add detailed context for debugging
  setSentryContext('firebasePermission', permissionContext);

  // Add breadcrumb with permission details
  addSentryBreadcrumb(
    `Firebase permission denied: ${context.operation} on ${context.path}`,
    'firebase.permission',
    permissionContext,
    'error'
  );

  // Create enhanced error with detailed message
  const enhancedError = new Error(
    `Firebase Permission Error\n` +
    `Operation: ${context.operation}\n` +
    `Path: ${context.path}\n` +
    `Collection: ${permissionContext.collection}\n` +
    `Document: ${permissionContext.documentId || 'N/A'}\n` +
    `User: ${context.userId || 'Not authenticated'}\n` +
    `Timestamp: ${permissionContext.timestamp}`
  );
  enhancedError.name = 'FirebasePermissionError';

  // Capture with specific fingerprint
  Sentry.withScope((scope) => {
    scope.setFingerprint([
      'firebase-permission',
      permissionContext.collection,
      permissionContext.operation,
    ]);
    scope.setLevel('error');
    scope.setTag('firebase.collection', permissionContext.collection);
    scope.setTag('firebase.operation', permissionContext.operation);
    scope.setTag('firebase.authenticated', String(permissionContext.authState.isAuthenticated));

    Sentry.captureException(enhancedError);
  });
}

/**
 * Common permission error scenarios and their likely causes
 */
export const PERMISSION_ERROR_HINTS = {
  'boards-read': {
    likelyCauses: [
      'User is not authenticated',
      'User does not have read permission for this board',
      'Board permissions not set in user.boardPermissions',
    ],
    requiredConditions: [
      'User must be authenticated (request.auth != null)',
      'User must have boardPermissions[boardId] = "read" or "write"',
    ],
    debugSteps: [
      'Check if user is logged in',
      'Verify user.boardPermissions contains this boardId',
      'Check Firebase Auth state in browser console',
    ],
  },
  'posts-read': {
    likelyCauses: [
      'User is not authenticated',
      'Post visibility is PRIVATE and user is not the author',
      'Parent board permissions not satisfied',
    ],
    requiredConditions: [
      'User must be authenticated',
      'Post must be PUBLIC OR user must be the author',
    ],
    debugSteps: [
      'Check post visibility field',
      'Verify user is authenticated',
      'Check if user is the post author',
    ],
  },
  'posts-create': {
    likelyCauses: [
      'User is not authenticated',
      'authorId in request does not match authenticated user',
      'Missing required fields in post data',
    ],
    requiredConditions: [
      'User must be authenticated',
      'request.auth.uid must equal request.resource.data.authorId',
    ],
    debugSteps: [
      'Verify authorId matches current user ID',
      'Check all required fields are present',
      'Ensure user has write permission for the board',
    ],
  },
  'users-read': {
    likelyCauses: [
      'User is not authenticated',
      'Trying to read another user\'s data',
    ],
    requiredConditions: [
      'User must be authenticated',
      'Can only read own user document (request.auth.uid == userId)',
    ],
    debugSteps: [
      'Check if userId matches authenticated user',
      'Verify authentication state',
    ],
  },
};

/**
 * Get debugging hints for a permission error
 */
export function getPermissionErrorHints(
  collection: string,
  operation: string
): typeof PERMISSION_ERROR_HINTS[keyof typeof PERMISSION_ERROR_HINTS] | null {
  const key = `${collection}-${operation}` as keyof typeof PERMISSION_ERROR_HINTS;
  return PERMISSION_ERROR_HINTS[key] || null;
}

/**
 * Enhanced wrapper for Firestore operations with permission tracking
 */
export function withPermissionTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: {
    operation: FirebasePermissionContext['operation'];
    getPath: (...args: Parameters<T>) => string;
    getName?: string;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const path = context.getPath(...args);

    try {
      const result = await fn(...args);

      // Log successful permission check
      addSentryBreadcrumb(
        `Firebase ${context.operation} succeeded: ${path}`,
        'firebase.success',
        { operation: context.operation, path },
        'info'
      );

      return result;
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        const userId = getCurrentUserIdFromStorage();

        trackFirebasePermissionError(error, {
          operation: context.operation,
          path,
          userId,
          additionalInfo: {
            functionName: context.getName || fn.name,
            arguments: args,
          },
        });

        // Add hints to the error
        const hints = getPermissionErrorHints(path.split('/')[0], context.operation);
        if (hints) {
          console.error('Permission Error Debugging Info:', {
            likelyCauses: hints.likelyCauses,
            requiredConditions: hints.requiredConditions,
            debugSteps: hints.debugSteps,
          });
        }
      }

      throw error;
    }
  }) as T;
}