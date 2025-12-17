/**
 * Tracked Firebase Operations with Online-Only Write Mode
 *
 * PROBLEM:
 * Firestore's offline persistence can get into a corrupted state when:
 * 1. User navigates away while operations are in progress
 * 2. Network transitions between online/offline states
 * 3. Multiple concurrent operations conflict in the sync queue
 *
 * When this happens, the internal AsyncQueueImpl throws:
 * "FIRESTORE INTERNAL ASSERTION FAILED: Unexpected state"
 *
 * This causes ALL subsequent Firestore operations to hang indefinitely,
 * resulting in infinite loading spinners for users.
 *
 * SOLUTION:
 * For write operations (setDoc, addDoc, updateDoc, deleteDoc):
 * 1. Force enable network before each write to bypass corrupted offline queue
 * 2. Add timeout protection to prevent infinite hangs
 * 3. Track and report errors with proper fingerprinting
 *
 * Read operations (getDoc, getDocs) continue to use offline cache normally.
 */

import {
  getDoc as firebaseGetDoc,
  getDocs as firebaseGetDocs,
  setDoc as firebaseSetDoc,
  addDoc as firebaseAddDoc,
  updateDoc as firebaseUpdateDoc,
  deleteDoc as firebaseDeleteDoc,
  enableNetwork,
  DocumentReference,
  CollectionReference,
  Query,
  WithFieldValue,
  UpdateData,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import * as Sentry from '@sentry/react';
import { addSentryBreadcrumb, setSentryContext } from '@/sentry';
import { trackFirebasePermissionError } from '@/shared/utils/firebaseErrorTracking';
import { getCurrentUserIdFromStorage } from '@/shared/utils/getCurrentUserId';
import { firestore } from '@/firebase';

// Timeout for write operations - prevents infinite hangs when sync queue is corrupted
const WRITE_OPERATION_TIMEOUT_MS = 10000;

// Timeout for re-enabling network connection before writes
const NETWORK_ENABLE_TIMEOUT_MS = 5000;

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

  // Check for Firestore internal assertion errors (sync queue corruption)
  const isInternalAssertionError =
    error instanceof Error &&
    error.message?.includes('INTERNAL ASSERTION FAILED');

  if (isInternalAssertionError) {
    Sentry.withScope((scope) => {
      scope.setFingerprint(['firestore', 'internal-assertion', 'sync-queue', operation]);
      scope.setLevel('warning');
      scope.setTag('firebase.operation', operation);
      scope.setTag('firebase.path', path);
      scope.setTag('error.type', 'firestore-sync-corruption');
      scope.setContext('firestoreSyncError', {
        operation,
        path,
        userId,
        hint: 'Firestore sync queue entered unexpected state. This typically happens when operations are interrupted during offline/online transitions.',
      });
      Sentry.captureException(error);
    });
    return;
  }

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
 * Force-enable network connection before write operations.
 *
 * WHY THIS IS NEEDED:
 * When Firestore's offline sync queue gets corrupted (e.g., user navigates away mid-operation),
 * subsequent writes queue up in the corrupted offline queue and never complete.
 * By explicitly enabling the network before each write, we bypass the offline queue
 * and send writes directly to the server.
 */
async function forceEnableNetworkBeforeWrite(): Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const enableNetworkPromise = enableNetwork(firestore);
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Network enable timeout')),
        NETWORK_ENABLE_TIMEOUT_MS
      );
    });

    await Promise.race([enableNetworkPromise, timeoutPromise]);
  } catch (error) {
    // Log but don't throw - the write operation itself will fail with a clearer error if truly offline
    addSentryBreadcrumb(
      'Failed to force-enable network before write',
      'firebase',
      { error: error instanceof Error ? error.message : String(error) },
      'warning'
    );
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Execute an operation with timeout protection.
 *
 * WHY THIS IS NEEDED:
 * When Firestore's sync queue is corrupted, operations can hang indefinitely
 * because the queue never processes them. This wrapper ensures we fail fast
 * with a clear error instead of showing infinite loading spinners to users.
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
          'This may indicate network issues or Firestore sync queue corruption.'
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
 * Tracked version of getDoc
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
 * Tracked version of getDocs
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
 * Write a document with online-only mode to prevent sync queue corruption.
 *
 * This wrapper:
 * 1. Forces network connection before write (bypasses corrupted offline queue)
 * 2. Adds timeout protection (prevents infinite hangs)
 * 3. Tracks performance and errors
 */
export async function setDoc<T extends DocumentData>(
  reference: DocumentReference<T>,
  data: WithFieldValue<T>
): Promise<void> {
  const documentPath = getPathFromReference(reference);
  const operationStartTime = Date.now();

  trackOperationStart('setDoc', documentPath);

  try {
    await forceEnableNetworkBeforeWrite();

    await executeWriteWithTimeoutProtection(
      () => firebaseSetDoc(reference, data),
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
 * Add a new document with online-only mode to prevent sync queue corruption.
 *
 * This wrapper:
 * 1. Forces network connection before write (bypasses corrupted offline queue)
 * 2. Adds timeout protection (prevents infinite hangs)
 * 3. Tracks performance and errors
 */
export async function addDoc<T extends DocumentData>(
  reference: CollectionReference<T>,
  data: WithFieldValue<T>
): Promise<DocumentReference<T>> {
  const collectionPath = getPathFromReference(reference);
  const operationStartTime = Date.now();

  trackOperationStart('addDoc', collectionPath);

  try {
    await forceEnableNetworkBeforeWrite();

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
 * Update a document with online-only mode to prevent sync queue corruption.
 *
 * This wrapper:
 * 1. Forces network connection before write (bypasses corrupted offline queue)
 * 2. Adds timeout protection (prevents infinite hangs)
 * 3. Tracks performance and errors
 */
export async function updateDoc<T extends DocumentData>(
  reference: DocumentReference<T>,
  data: UpdateData<T>
): Promise<void> {
  const documentPath = getPathFromReference(reference);
  const operationStartTime = Date.now();

  trackOperationStart('updateDoc', documentPath);

  try {
    await forceEnableNetworkBeforeWrite();

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
 * Delete a document with online-only mode to prevent sync queue corruption.
 *
 * This wrapper:
 * 1. Forces network connection before write (bypasses corrupted offline queue)
 * 2. Adds timeout protection (prevents infinite hangs)
 * 3. Tracks performance and errors
 */
export async function deleteDoc(reference: DocumentReference): Promise<void> {
  const documentPath = getPathFromReference(reference);
  const operationStartTime = Date.now();

  trackOperationStart('deleteDoc', documentPath);

  try {
    await forceEnableNetworkBeforeWrite();

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
 * Tracked Firebase operations with online-only write mode.
 *
 * Use these instead of direct Firebase imports for:
 * - Automatic error tracking and Sentry integration
 * - Online-only writes that prevent sync queue corruption
 * - Timeout protection against infinite hangs
 * - Performance monitoring
 *
 * Read operations (getDoc, getDocs) work normally with offline cache.
 * Write operations (setDoc, addDoc, updateDoc, deleteDoc) force online mode.
 */
export const trackedFirebase = {
  // Read operations (use offline cache normally)
  getDoc,
  getDocs,

  // Write operations (force online mode to prevent sync corruption)
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
};