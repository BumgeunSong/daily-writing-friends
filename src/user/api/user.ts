/**
 * Core User API operations.
 * CRUD operations for user documents and profile management.
 *
 * Use consistent naming:
 * - fetchX() → read-only function
 * - createX(), updateX() → write operations
 * - uploadX() → storage operations
 */
import { User as FirebaseUser } from 'firebase/auth';
import { doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from '@/firebase';
import { User, UserOptionalFields, UserRequiredFields } from '@/user/model/User';
import { trackedFirebase } from '@/shared/api/trackedFirebase';

// Re-export blocking operations for backward compatibility
export {
  blockUser,
  unblockUser,
  getBlockedUsers,
  getBlockedByUsers,
  addBlockedUser,
  removeBlockedUser,
} from './blocking';

// Re-export query utilities for backward compatibility
export {
  fetchUsersWithBoardPermission,
  fetchAllUsers,
  buildNotInQuery,
} from './userQuery';

/**
 * Fetch a user document by UID.
 */
export async function fetchUser(uid: string): Promise<User | null> {
  const userDocRef = doc(firestore, 'users', uid);
  const userDoc = await trackedFirebase.getDoc(userDocRef);
  if (!userDoc.exists()) return null;
  return userDoc.data() as User;
}

/**
 * Create a new user document.
 */
export async function createUser(data: User): Promise<void> {
  const userDocRef = doc(firestore, 'users', data.uid);
  await trackedFirebase.setDoc(userDocRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update an existing user document.
 */
export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  const userDocRef = doc(firestore, 'users', uid);
  await trackedFirebase.updateDoc(userDocRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a user document.
 */
export async function deleteUser(uid: string): Promise<void> {
  const userDocRef = doc(firestore, 'users', uid);
  await trackedFirebase.deleteDoc(userDocRef);
}

/**
 * Upload a profile photo to Firebase Storage and return the download URL.
 */
export async function uploadUserProfilePhoto(userId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `profilePhotos/${userId}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Create a user document if it doesn't exist.
 * Used when a Firebase Auth user needs a corresponding Firestore document.
 */
export async function createUserIfNotExists(user: FirebaseUser): Promise<void> {
  const existing = await fetchUser(user.uid);
  if (!existing) {
    const requiredFields: UserRequiredFields = {
      uid: user.uid,
      realName: user.displayName,
      nickname: user.displayName,
      email: user.email,
      profilePhotoURL: user.photoURL,
    };

    const defaultUserFields: UserOptionalFields = {
      bio: null,
      phoneNumber: null,
      referrer: null,
      boardPermissions: {
        'rW3Y3E2aEbpB0KqGiigd': 'read', // Default board ID
      },
      updatedAt: Timestamp.now(),
    };

    await createUser({
      ...requiredFields,
      ...defaultUserFields,
    });
  }
}
