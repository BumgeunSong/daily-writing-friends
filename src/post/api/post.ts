import { collection, startAfter, limit, query, where, orderBy } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Post } from '@/post/model/Post';
import { mapDocumentToPost } from '@/post/utils/postUtils';
import { trackedFirebase } from '@/shared/api/trackedFirebase';
import { buildNotInQuery } from '@/user/api/user';
import { getReadSource } from '@/shared/api/supabaseClient';
import { fetchRecentPostsFromSupabase, fetchBestPostsFromSupabase } from '@/shared/api/supabaseReads';
import { compareShadowResults, logShadowMismatch } from '@/shared/api/shadowReads';

// TODO: Re-enable when best posts feature is implemented
// const BEST_POSTS_DAYS_RANGE = 7;

/**
 * 최근 게시글을 불러옴 (createdAt 내림차순, blockedByUsers 서버사이드 필터링)
 * @param boardId
 * @param limitCount
 * @param blockedByUsers
 * @param after
 * @returns Post[]
 */
export async function fetchRecentPosts(
  boardId: string,
  limitCount: number,
  blockedByUsers: string[] = [],
  after?: Date
): Promise<Post[]> {
  const readSource = getReadSource();
  if (readSource === 'supabase') {
    return fetchRecentPostsFromSupabase(boardId, limitCount, blockedByUsers, after);
  }

  const postsRef = collection(firestore, `boards/${boardId}/posts`);
  let q = buildNotInQuery(postsRef, 'authorId', blockedByUsers, ['createdAt', 'desc']);
  if (limitCount) {
    q = query(q, limit(limitCount));
  }
  if (after) {
    q = query(q, startAfter(after));
  }
  const snapshot = await trackedFirebase.getDocs(q);
  const firestoreData = snapshot.docs.map(doc => mapDocumentToPost(doc));

  if (readSource === 'shadow') {
    fetchRecentPostsFromSupabase(boardId, limitCount, blockedByUsers, after)
      .then((supabaseData) => {
        const result = compareShadowResults(firestoreData, supabaseData, (item) => item.id);
        if (!result.match) {
          logShadowMismatch('recentPosts', boardId, result);
        }
      })
      .catch((error) => {
        console.error('Shadow read failed for recentPosts:', error);
      });
  }

  return firestoreData;
}

/**
 * engagementScore 높은 순으로 게시글 불러옴 (서버 사이드 정렬)
 * 클라이언트에서 7일 필터링 수행
 */
export async function fetchBestPosts(
  boardId: string,
  limitCount: number,
  blockedByUsers: string[] = [],
  afterScore?: number
): Promise<Post[]> {
  const readSource = getReadSource();
  if (readSource === 'supabase') {
    return fetchBestPostsFromSupabase(boardId, limitCount, blockedByUsers, afterScore);
  }

  const postsRef = collection(firestore, `boards/${boardId}/posts`);

  let q = query(
    postsRef,
    orderBy('engagementScore', 'desc'),
    limit(limitCount)
  );

  if (blockedByUsers.length > 0 && blockedByUsers.length <= 10) {
    q = query(q, where('authorId', 'not-in', blockedByUsers));
  }

  if (afterScore !== undefined) {
    q = query(q, startAfter(afterScore));
  }

  const snapshot = await trackedFirebase.getDocs(q);
  const firestoreData = snapshot.docs.map(doc => mapDocumentToPost(doc));

  if (readSource === 'shadow') {
    fetchBestPostsFromSupabase(boardId, limitCount, blockedByUsers, afterScore)
      .then((supabaseData) => {
        const result = compareShadowResults(firestoreData, supabaseData, (item) => item.id);
        if (!result.match) {
          logShadowMismatch('bestPosts', boardId, result);
        }
      })
      .catch((error) => {
        console.error('Shadow read failed for bestPosts:', error);
      });
  }

  return firestoreData;
}

/**
 * 게시글이 최근 7일 내인지 확인
 */
export function isWithinDays(post: Post, days: number): boolean {
  if (!post.createdAt) return false;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const postDate = post.createdAt.toDate();
  return postDate >= cutoffDate;
}
