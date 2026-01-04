/**
 * User query utilities.
 * Helper functions for querying users with various filters.
 */
import {
  collection,
  where,
  query,
  orderBy,
  or,
  CollectionReference,
  Query,
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { trackedFirebase } from '@/shared/api/trackedFirebase';
import type { User } from '@/user/model/User';

/**
 * Fetch all users with write permission to any of the specified boards.
 * Uses Firestore OR query for multiple board conditions.
 */
export async function fetchUsersWithBoardPermission(boardIds: string[]): Promise<User[]> {
  try {
    if (boardIds.length === 0) return [];

    const conditions = boardIds.map((boardId) =>
      where(`boardPermissions.${boardId}`, '==', 'write')
    );

    const q = query(collection(firestore, 'users'), or(...conditions));

    const snapshot = await trackedFirebase.getDocs(q);
    const users: User[] = [];

    snapshot.docs.forEach((doc) => {
      const userData = doc.data() as User;
      users.push({
        ...userData,
        uid: doc.id,
      });
    });

    return users;
  } catch (error) {
    console.error('Error fetching users with board permission:', error);
    return [];
  }
}

/**
 * Fetch all users in the system.
 * Note: Use with caution for large user bases.
 */
export async function fetchAllUsers(): Promise<User[]> {
  try {
    const usersSnap = await trackedFirebase.getDocs(collection(firestore, 'users'));
    return usersSnap.docs.map((doc) => doc.data() as User);
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

/**
 * Build a Firestore query with not-in constraint.
 * Firestore limits not-in to 10 values, so this skips the constraint if exceeded.
 *
 * @param ref Firestore collection reference
 * @param field Field name for not-in constraint
 * @param notInList Array of values to exclude
 * @param restOrderBy Additional orderBy constraints as [field, direction] tuples
 * @returns Firestore Query with constraints applied
 */
export function buildNotInQuery<T = unknown>(
  ref: CollectionReference<T>,
  field: string,
  notInList: string[],
  ...restOrderBy: [string, 'asc' | 'desc'][]
): Query<T> {
  let q: Query<T> = ref;
  if (notInList.length > 0 && notInList.length <= 10) {
    q = query(
      ref,
      where(field, 'not-in', notInList),
      ...restOrderBy.map(([f, dir]) => orderBy(f, dir))
    );
  } else {
    q = query(
      ref,
      ...restOrderBy.map(([f, dir]) => orderBy(f, dir))
    );
  }
  return q;
}
