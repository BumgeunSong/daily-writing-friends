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
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import * as Sentry from '@sentry/react';
import { addSentryBreadcrumb, setSentryContext } from '@/sentry';
import { trackFirebasePermissionError } from '@/shared/utils/firebaseErrorTracking';
import { getCurrentUserIdFromStorage } from '@/shared/utils/getCurrentUserId';

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
 * Tracked version of setDoc
 */
export async function setDoc<T extends DocumentData>(
  reference: DocumentReference<T>,
  data: WithFieldValue<T>
): Promise<void> {
  const path = getPathFromReference(reference);
  const startTime = Date.now();

  trackOperationStart('setDoc', path);

  try {
    await firebaseSetDoc(reference, data);
    const duration = Date.now() - startTime;

    if (duration > 3000) {
      addSentryBreadcrumb(
        `Slow Firebase operation: setDoc took ${duration}ms`,
        'performance',
        { path, duration },
        'warning'
      );
    }
  } catch (error) {
    trackOperationError(error, 'write', path);
    throw error;
  }
}

/**
 * Tracked version of addDoc
 */
export async function addDoc<T extends DocumentData>(
  reference: CollectionReference<T>,
  data: WithFieldValue<T>
): Promise<DocumentReference<T>> {
  const path = getPathFromReference(reference);
  const startTime = Date.now();

  trackOperationStart('addDoc', path);

  try {
    const result = await firebaseAddDoc(reference, data);
    const duration = Date.now() - startTime;

    if (duration > 3000) {
      addSentryBreadcrumb(
        `Slow Firebase operation: addDoc took ${duration}ms`,
        'performance',
        { path, duration },
        'warning'
      );
    }

    return result;
  } catch (error) {
    trackOperationError(error, 'create', path);
    throw error;
  }
}

/**
 * Tracked version of updateDoc
 */
export async function updateDoc<T extends DocumentData>(
  reference: DocumentReference<T>,
  data: UpdateData<T>
): Promise<void> {
  const path = getPathFromReference(reference);
  const startTime = Date.now();

  trackOperationStart('updateDoc', path);

  try {
    await firebaseUpdateDoc(reference, data);
    const duration = Date.now() - startTime;

    if (duration > 3000) {
      addSentryBreadcrumb(
        `Slow Firebase operation: updateDoc took ${duration}ms`,
        'performance',
        { path, duration },
        'warning'
      );
    }
  } catch (error) {
    trackOperationError(error, 'update', path);
    throw error;
  }
}

/**
 * Tracked version of deleteDoc
 */
export async function deleteDoc(reference: DocumentReference): Promise<void> {
  const path = getPathFromReference(reference);
  const startTime = Date.now();

  trackOperationStart('deleteDoc', path);

  try {
    await firebaseDeleteDoc(reference);
    const duration = Date.now() - startTime;

    if (duration > 3000) {
      addSentryBreadcrumb(
        `Slow Firebase operation: deleteDoc took ${duration}ms`,
        'performance',
        { path, duration },
        'warning'
      );
    }
  } catch (error) {
    trackOperationError(error, 'delete', path);
    throw error;
  }
}

/**
 * Export tracked Firebase object for easy migration
 */
export const trackedFirebase = {
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
};