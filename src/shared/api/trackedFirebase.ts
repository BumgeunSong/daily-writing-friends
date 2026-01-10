/**
 * Tracked Firebase Operations
 *
 * Provides wrapper functions for Firestore operations with:
 * - Automatic error tracking and Sentry integration
 * - Timeout protection against network hangs
 * - Performance monitoring for slow operations
 *
 * NOTE: Offline persistence is disabled (using memoryLocalCache).
 * This eliminates sync queue corruption issues but requires network connectivity.
 */

import * as Sentry from '@sentry/react';
import { FirebaseError } from 'firebase/app';
import {
  getDoc as firebaseGetDoc,
  getDocs as firebaseGetDocs,
  setDoc as firebaseSetDoc,
  addDoc as firebaseAddDoc,
  updateDoc as firebaseUpdateDoc,
  deleteDoc as firebaseDeleteDoc,
  DocumentReference,
  CollectionReference,
  Query,
  WithFieldValue,
  UpdateData,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  SetOptions,
} from 'firebase/firestore';
import { addSentryBreadcrumb, setSentryContext } from '@/sentry';
import { trackFirebasePermissionError } from '@/shared/utils/firebaseErrorTracking';
import { getCurrentUserIdFromStorage } from '@/shared/utils/getCurrentUserId';

// Timeout for write operations - prevents infinite hangs on network issues
const WRITE_OPERATION_TIMEOUT_MS = 10000;

// Threshold for logging slow operations
const SLOW_OPERATION_THRESHOLD_MS = 3000;


/**
 * Extract path from Firebase reference using only public APIs
 */
function getPathFromReference(ref: DocumentReference | CollectionReference | Query): string {
  // DocumentReference and CollectionReference have public path property
  if ('path' in ref && typeof (ref as any).path === 'string') {
    return (ref as DocumentReference | CollectionReference).path;
  }

  // For Query objects, we can't reliably get the path using public APIs
  // So we'll use a safe approach that doesn't depend on private properties
  try {
    // Check if it's a Query by looking for public query methods
    if ('where' in ref && 'orderBy' in ref && 'limit' in ref) {
      // It's a Query object - use toString() as a safe fallback
      const queryString = ref.toString();

      // Try to extract collection path from the string representation
      // This is safer than accessing private properties
      const collectionMatch = queryString.match(/Query\(([^/\s]+(?:\/[^/\s]+)*)/);
      if (collectionMatch && collectionMatch[1]) {
        const basePath = collectionMatch[1].split(' ')[0]; // Remove query conditions
        return basePath || 'firestore-query';
      }
    }

    // If we can't determine the type, return a generic identifier
    return 'firestore-operation';
  } catch (error) {
    // If toString() fails or any other error occurs, use a safe fallback
    console.warn('Could not extract path from Firebase reference, using fallback:', error);
    return 'firebase-operation';
  }
}

/**
 * Track Firebase operation start
 */
function trackOperationStart(operation: string, path: string) {
  addSentryBreadcrumb(
    `Firebase ${operation}: ${path}`,
    'firebase',
    { operation, path },
    'info'
  );
}

/**
 * Track Firebase operation error
 */
function trackOperationError(
  error: unknown,
  operation: 'read' | 'write' | 'create' | 'update' | 'delete',
  path: string
) {
  const userId = getCurrentUserIdFromStorage();

  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      trackFirebasePermissionError(error, {
        operation,
        path,
        userId,
        additionalInfo: {
          source: 'direct-firebase-call',
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      setSentryContext('firebaseError', {
        operation,
        path,
        errorCode: error.code,
        errorMessage: error.message,
        userId,
      });

      Sentry.withScope((scope) => {
        scope.setFingerprint(['firebase-direct', error.code, operation]);
        scope.setLevel('error');
        scope.setTag('firebase.operation', operation);
        scope.setTag('firebase.path', path);
        scope.setTag('firebase.code', error.code);
        Sentry.captureException(error);
      });
    }
  } else {
    // Non-Firebase errors
    const enhancedError = new Error(
      `Firebase operation failed: ${operation} on ${path}\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );

    Sentry.captureException(enhancedError);
  }
}

/**
 * Execute an operation with timeout protection.
 * Ensures we fail fast with a clear error instead of hanging indefinitely on network issues.
 */
async function executeWriteWithTimeoutProtection<T>(
  writeOperation: () => Promise<T>,
  operationName: string,
  documentPath: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const operationPromise = writeOperation();
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        const timeoutError = new Error(
          `Firebase ${operationName} timed out after ${WRITE_OPERATION_TIMEOUT_MS}ms on ${documentPath}. ` +
          'This may indicate network connectivity issues.'
        );
        reject(timeoutError);
      }, WRITE_OPERATION_TIMEOUT_MS);
    });

    return await Promise.race([operationPromise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Tracked version of getDoc with error tracking and performance monitoring.
 */
export async function getDoc<T extends DocumentData>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  const path = getPathFromReference(reference);
  const startTime = Date.now();

  trackOperationStart('getDoc', path);

  try {
    const result = await firebaseGetDoc(reference);
    const duration = Date.now() - startTime;

    if (duration > 3000) {
      addSentryBreadcrumb(
        `Slow Firebase operation: getDoc took ${duration}ms`,
        'performance',
        { path, duration },
        'warning'
      );
    }

    return result;
  } catch (error) {
    trackOperationError(error, 'read', path);
    throw error;
  }
}

/**
 * Tracked version of getDocs with error tracking and performance monitoring.
 */
export async function getDocs<T extends DocumentData>(
  query: Query<T>
): Promise<QuerySnapshot<T>> {
  const path = getPathFromReference(query);
  const startTime = Date.now();

  trackOperationStart('getDocs', path);

  try {
    const result = await firebaseGetDocs(query);
    const duration = Date.now() - startTime;

    if (duration > 3000) {
      addSentryBreadcrumb(
        `Slow Firebase operation: getDocs took ${duration}ms`,
        'performance',
        { path, duration, resultSize: result.size },
        'warning'
      );
    }

    return result;
  } catch (error) {
    trackOperationError(error, 'read', path);
    throw error;
  }
}

/**
 * Tracked version of setDoc with timeout protection and error tracking.
 */
export async function setDoc<T extends DocumentData>(
  reference: DocumentReference<T>,
  data: WithFieldValue<T>,
  options?: SetOptions
): Promise<void> {
  const documentPath = getPathFromReference(reference);
  const operationStartTime = Date.now();

  trackOperationStart('setDoc', documentPath);

  try {
    await executeWriteWithTimeoutProtection(
      () => options ? firebaseSetDoc(reference, data, options) : firebaseSetDoc(reference, data),
      'setDoc',
      documentPath
    );

    const operationDuration = Date.now() - operationStartTime;
    const isSlowOperation = operationDuration > SLOW_OPERATION_THRESHOLD_MS;

    if (isSlowOperation) {
      addSentryBreadcrumb(
        `Slow Firebase setDoc: ${operationDuration}ms`,
        'performance',
        { path: documentPath, duration: operationDuration },
        'warning'
      );
    }
  } catch (error) {
    trackOperationError(error, 'write', documentPath);
    throw error;
  }
}

/**
 * Tracked version of addDoc with timeout protection and error tracking.
 */
export async function addDoc<T extends DocumentData>(
  reference: CollectionReference<T>,
  data: WithFieldValue<T>
): Promise<DocumentReference<T>> {
  const collectionPath = getPathFromReference(reference);
  const operationStartTime = Date.now();

  trackOperationStart('addDoc', collectionPath);

  try {
    const newDocumentRef = await executeWriteWithTimeoutProtection(
      () => firebaseAddDoc(reference, data),
      'addDoc',
      collectionPath
    );

    const operationDuration = Date.now() - operationStartTime;
    const isSlowOperation = operationDuration > SLOW_OPERATION_THRESHOLD_MS;

    if (isSlowOperation) {
      addSentryBreadcrumb(
        `Slow Firebase addDoc: ${operationDuration}ms`,
        'performance',
        { path: collectionPath, duration: operationDuration },
        'warning'
      );
    }

    return newDocumentRef;
  } catch (error) {
    trackOperationError(error, 'create', collectionPath);
    throw error;
  }
}

/**
 * Tracked version of updateDoc with timeout protection and error tracking.
 */
export async function updateDoc<T extends DocumentData>(
  reference: DocumentReference<T>,
  data: UpdateData<T>
): Promise<void> {
  const documentPath = getPathFromReference(reference);
  const operationStartTime = Date.now();

  trackOperationStart('updateDoc', documentPath);

  try {
    await executeWriteWithTimeoutProtection(
      () => firebaseUpdateDoc(reference, data),
      'updateDoc',
      documentPath
    );

    const operationDuration = Date.now() - operationStartTime;
    const isSlowOperation = operationDuration > SLOW_OPERATION_THRESHOLD_MS;

    if (isSlowOperation) {
      addSentryBreadcrumb(
        `Slow Firebase updateDoc: ${operationDuration}ms`,
        'performance',
        { path: documentPath, duration: operationDuration },
        'warning'
      );
    }
  } catch (error) {
    trackOperationError(error, 'update', documentPath);
    throw error;
  }
}

/**
 * Tracked version of deleteDoc with timeout protection and error tracking.
 */
export async function deleteDoc(reference: DocumentReference): Promise<void> {
  const documentPath = getPathFromReference(reference);
  const operationStartTime = Date.now();

  trackOperationStart('deleteDoc', documentPath);

  try {
    await executeWriteWithTimeoutProtection(
      () => firebaseDeleteDoc(reference),
      'deleteDoc',
      documentPath
    );

    const operationDuration = Date.now() - operationStartTime;
    const isSlowOperation = operationDuration > SLOW_OPERATION_THRESHOLD_MS;

    if (isSlowOperation) {
      addSentryBreadcrumb(
        `Slow Firebase deleteDoc: ${operationDuration}ms`,
        'performance',
        { path: documentPath, duration: operationDuration },
        'warning'
      );
    }
  } catch (error) {
    trackOperationError(error, 'delete', documentPath);
    throw error;
  }
}

/**
 * Tracked Firebase operations.
 *
 * Use these instead of direct Firebase imports for:
 * - Automatic error tracking and Sentry integration
 * - Timeout protection against network hangs
 * - Performance monitoring for slow operations
 */
export const trackedFirebase = {
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
};