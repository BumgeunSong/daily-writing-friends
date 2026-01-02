import { collection, startAfter, limit, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Post } from '@/post/model/Post';
import { mapDocumentToPost } from '@/post/utils/postUtils';
import { buildNotInQuery } from '@/user/api/user';
import { trackedFirebase } from '@/shared/api/trackedFirebase';

const BEST_POSTS_DAYS_RANGE = 7;

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

/**
 * 최근 7일 내 게시글 중 engagementScore 높은 순으로 불러옴
 * Firestore 복합 인덱스 필요: createdAt(asc) + engagementScore(desc)
 */
export async function fetchBestPosts(
  boardId: string,
  limitCount: number,
  blockedByUsers: string[] = [],
  afterScore?: number
): Promise<Post[]> {
  const postsRef = collection(firestore, `boards/${boardId}/posts`);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - BEST_POSTS_DAYS_RANGE);
  const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

  let q = query(
    postsRef,
    where('createdAt', '>=', sevenDaysAgoTimestamp),
    orderBy('createdAt', 'asc'),
    orderBy('engagementScore', 'desc')
  );

  if (blockedByUsers.length > 0 && blockedByUsers.length <= 10) {
    q = query(q, where('authorId', 'not-in', blockedByUsers));
  }

  if (limitCount) {
    q = query(q, limit(limitCount));
  }

  if (afterScore !== undefined) {
    q = query(q, startAfter(afterScore));
  }

  const snapshot = await trackedFirebase.getDocs(q);
  return snapshot.docs.map(doc => mapDocumentToPost(doc));
}
