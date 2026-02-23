import * as Sentry from '@sentry/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Post } from '@/post/model/Post';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { mapRowToPost } from '@/shared/api/supabaseReads';

const LIMIT_COUNT = 10;

type PostWithPaginationMetadata = Post & {
  _paginationCursor?: string;
  _fetchedFullPage?: boolean;
};

/**
 * 특정 사용자가 작성한 포스트를 가져오는 커스텀 훅
 */
export const useUserPosts = (userId: string) => {
  return useInfiniteQuery<PostWithPaginationMetadata[]>(
    ['userPosts', userId],
    async ({ pageParam = null }) => {
      return fetchUserPostsFromSupabase(userId, pageParam as string | null);
    },
    {
      enabled: !!userId,
      getNextPageParam: (lastPage) => {
        if (lastPage.length === 0) return undefined;
        const lastPost = lastPage[lastPage.length - 1];
        return lastPost?._fetchedFullPage && lastPost?._paginationCursor
          ? lastPost._paginationCursor
          : undefined;
      },
      onError: (error) => {
        console.error('사용자 게시글을 불러오던 중 에러가 발생했습니다:', error);
        Sentry.captureException(error);
      },
      staleTime: 1000 * 60,
      cacheTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }
  );
};

/**
 * Fetch user posts from Supabase posts table
 */
async function fetchUserPostsFromSupabase(
  userId: string,
  cursor: string | null
): Promise<PostWithPaginationMetadata[]> {
  const supabase = getSupabaseClient();

  let queryBuilder = supabase
    .from('posts')
    .select('*, boards(first_day), comments(count), replies(count)')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(LIMIT_COUNT);

  if (cursor) {
    queryBuilder = queryBuilder.lt('created_at', cursor);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Supabase fetchUserPosts error:', error);
    Sentry.captureException(error);
    return [];
  }

  const posts: PostWithPaginationMetadata[] = (data || []).map((row) => ({
    ...mapRowToPost(row),
    _paginationCursor: row.created_at,
    _fetchedFullPage: data.length === LIMIT_COUNT,
  }));

  return posts;
}
