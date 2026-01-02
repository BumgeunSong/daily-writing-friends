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
 * 클라이언트 사이드 정렬: Firestore는 range filter 필드가 첫 orderBy여야 하므로
 * 전체 조회 후 engagementScore로 정렬
 */
export async function fetchBestPosts(
  boardId: string,
  limitCount: number,
  blockedByUsers: string[] = []
): Promise<Post[]> {
  const postsRef = collection(firestore, `boards/${boardId}/posts`);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - BEST_POSTS_DAYS_RANGE);
  const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

  let q = query(
    postsRef,
    where('createdAt', '>=', sevenDaysAgoTimestamp)
  );

  if (blockedByUsers.length > 0 && blockedByUsers.length <= 10) {
    q = query(q, where('authorId', 'not-in', blockedByUsers));
  }

  const snapshot = await trackedFirebase.getDocs(q);
  const posts = snapshot.docs.map(doc => mapDocumentToPost(doc));

  return posts
    .sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))
    .slice(0, limitCount);
}
