import { collection, startAfter, limit, query } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Post } from '@/post/model/Post';
import { mapDocumentToPost } from '@/post/utils/postUtils';
import { buildNotInQuery } from '@/user/api/user';
import { trackedFirebase } from '@/shared/api/trackedFirebase';

/**
 * Firestore에서 게시글을 불러옴 (blockedByUsers 서버사이드 필터링)
 * @param boardId
 * @param limitCount
 * @param blockedByUsers
 * @param after
 * @returns Post[]
 */
export async function fetchPosts(
  boardId: string,
  limitCount: number,
  blockedByUsers: string[] = [],
  after?: Date
): Promise<Post[]> {
  const postsRef = collection(firestore, `boards/${boardId}/posts`);
  let q = buildNotInQuery(postsRef, 'authorId', blockedByUsers, ['createdAt', 'desc']);
  if (limitCount) {
    q = query(q, limit(limitCount));
  }
  if (after) {
    q = query(q, startAfter(after));
  }
  const snapshot = await trackedFirebase.getDocs(q);
  return snapshot.docs.map(doc => mapDocumentToPost(doc));
}
