import { Post } from '@/post/model/Post';
import { fetchRecentPostsFromSupabase, fetchBestPostsFromSupabase } from '@/shared/api/supabaseReads';

/**
 * 최근 게시글을 불러옴 (createdAt 내림차순, blockedByUsers 서버사이드 필터링)
 */
export async function fetchRecentPosts(
  boardId: string,
  limitCount: number,
  blockedByUsers: string[] = [],
  after?: Date
): Promise<Post[]> {
  return fetchRecentPostsFromSupabase(boardId, limitCount, blockedByUsers, after);
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
  return fetchBestPostsFromSupabase(boardId, limitCount, blockedByUsers, afterScore);
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
