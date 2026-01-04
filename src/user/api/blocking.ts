/**
 * User blocking API operations.
 * Handles blocking/unblocking users and fetching blocked user lists.
 */
import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { trackedFirebase } from '@/shared/api/trackedFirebase';
import { fetchUser, updateUser } from './user';

/**
 * Block a user using subcollection approach.
 * Creates documents in both users' subcollections for bidirectional lookup.
 */
export async function blockUser(blockerId: string, blockedId: string) {
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, `users/${blockerId}/blockedUsers/${blockedId}`), {
    blockedAt: serverTimestamp(),
  });
  batch.set(doc(firestore, `users/${blockedId}/blockedByUsers/${blockerId}`), {
    blockedAt: serverTimestamp(),
  });
  await batch.commit();
}

/**
 * Unblock a user by removing documents from both subcollections.
 */
export async function unblockUser(blockerId: string, blockedId: string) {
  const batch = writeBatch(firestore);
  batch.delete(doc(firestore, `users/${blockerId}/blockedUsers/${blockedId}`));
  batch.delete(doc(firestore, `users/${blockedId}/blockedByUsers/${blockerId}`));
  await batch.commit();
}

/**
 * Get list of user IDs that the current user has blocked.
 */
export async function getBlockedUsers(userId: string): Promise<string[]> {
  const snap = await trackedFirebase.getDocs(
    collection(firestore, `users/${userId}/blockedUsers`)
  );
  return snap.docs.map((doc) => doc.id);
}

/**
 * Get list of user IDs that have blocked the current user.
 */
export async function getBlockedByUsers(userId: string): Promise<string[]> {
  const snap = await trackedFirebase.getDocs(
    collection(firestore, `users/${userId}/blockedByUsers`)
  );
  return snap.docs.map((doc) => doc.id);
}

/**
 * Add blocker uid to a user's blockedBy array (legacy approach).
 * @deprecated Use blockUser instead which uses subcollections
 */
export async function addBlockedUser(myUid: string, blockedUid: string): Promise<void> {
  const blockedUser = await fetchUser(blockedUid);
  if (!blockedUser) throw new Error('User to be blocked not found');
  const blockedBy = Array.isArray(blockedUser.blockedBy) ? blockedUser.blockedBy : [];
  if (blockedBy.includes(myUid)) return;
  const updated = [...blockedBy, myUid];
  await updateUser(blockedUid, { blockedBy: updated });
}

/**
 * Remove blocker uid from a user's blockedBy array (legacy approach).
 * @deprecated Use unblockUser instead which uses subcollections
 */
export async function removeBlockedUser(myUid: string, blockedUid: string): Promise<void> {
  const blockedUser = await fetchUser(blockedUid);
  if (!blockedUser) throw new Error('User to be unblocked not found');
  const blockedBy = Array.isArray(blockedUser.blockedBy) ? blockedUser.blockedBy : [];
  if (!blockedBy.includes(myUid)) return;
  const updated = blockedBy.filter((uid) => uid !== myUid);
  await updateUser(blockedUid, { blockedBy: updated });
}
