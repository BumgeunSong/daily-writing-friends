import { FirebaseError } from 'firebase/app';
import { LoaderFunctionArgs } from 'react-router-dom';
import { getCurrentUser } from '@/shared/utils/authUtils';
import { trackFirebasePermissionError, getPermissionErrorHints } from '@/shared/utils/firebaseErrorTracking';
import { getCurrentUserIdFromStorage } from '@/shared/utils/getCurrentUserId';
import { fetchUser } from '@/user/api/user';

export async function boardLoader({ params }: LoaderFunctionArgs) {
  const { boardId } = params;
  
  if (!boardId) {
    throw new Response('Missing board ID', { status: 400 });
  }

  try {
    // Get current user
    const user = await getCurrentUser();

    if (!user) {
      // Track permission error for unauthenticated access
      const permissionError = new FirebaseError('permission-denied', 'User not authenticated');
      trackFirebasePermissionError(permissionError, {
        operation: 'read',
        path: `boards/${boardId}`,
        userId: undefined,
        additionalInfo: {
          reason: 'No authenticated user',
          boardId,
        },
      });

      // Return empty data instead of throwing, let route guard handle auth
      return { boardId };
    }

    // Check board permissions before allowing access
    const userData = await fetchUser(user.uid);
    if (!userData) {
      // Track permission error for missing user data
      const permissionError = new FirebaseError('permission-denied', 'User data not found');
      trackFirebasePermissionError(permissionError, {
        operation: 'read',
        path: `users/${user.uid}`,
        userId: user.uid,
        additionalInfo: {
          reason: 'User document not found in Firestore',
          boardId,
        },
      });

      throw new Response('User data not found', { status: 403 });
    }

    const userPermission = userData.boardPermissions?.[boardId];
    if (userPermission !== 'read' && userPermission !== 'write') {
      // Track permission error for insufficient board permissions
      const permissionError = new FirebaseError('permission-denied', 'Insufficient board permissions');
      trackFirebasePermissionError(permissionError, {
        operation: 'read',
        path: `boards/${boardId}`,
        userId: user.uid,
        additionalInfo: {
          reason: 'User lacks read/write permission for board',
          userPermission: userPermission || 'none',
          requiredPermission: 'read or write',
          boardId,
          availablePermissions: Object.keys(userData.boardPermissions || {}),
        },
      });

      // Log hints for debugging
      const hints = getPermissionErrorHints('boards', 'read');
      if (hints) {
        console.error('Board Permission Error - Debug Info:', {
          boardId,
          userId: user.uid,
          currentPermission: userPermission || 'none',
          ...hints,
        });
      }

      throw new Response('Access denied - insufficient board permissions', { status: 403 });
    }

    return { boardId };
  } catch (error) {
    console.error('Failed to validate board access:', error);

    // Track Firebase permission errors
    if (error instanceof FirebaseError && error.code === 'permission-denied') {
      trackFirebasePermissionError(error, {
        operation: 'read',
        path: `boards/${boardId}`,
        userId: getCurrentUserIdFromStorage(),
        additionalInfo: {
          source: 'boardLoader',
          boardId,
        },
      });
    }

    if (error instanceof Response) {
      throw error; // Re-throw Response errors (permission/auth errors)
    }
    throw new Response('Board access validation failed', { status: 500 });
  }
}