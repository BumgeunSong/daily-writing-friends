import * as Sentry from '@sentry/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  limit,
  query,
  collection,
  orderBy,
  getDocs,
  startAfter,
  doc,
  getDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Post } from '@/post/model/Post';
import { Posting } from '@/post/model/Posting';
import { mapDocumentToPost } from '@/post/utils/postUtils';
import { getReadSource, getSupabaseClient } from '@/shared/api/supabaseClient';

const LIMIT_COUNT = 10;

type PostWithPaginationMetadata = Post & {
  _paginationCursor?: QueryDocumentSnapshot<DocumentData> | string;
  _fetchedFullPage?: boolean;
};

/**
 * 특정 사용자가 작성한 포스트를 가져오는 커스텀 훅
 * Supports both Firestore and Supabase read sources
 */
export const useUserPosts = (userId: string) => {
  const readSource = getReadSource();

  return useInfiniteQuery<PostWithPaginationMetadata[]>(
    ['userPosts', userId, readSource],
    ({ pageParam = null }) => {
      if (readSource === 'supabase' || readSource === 'shadow') {
        return fetchUserPostsFromSupabase(userId, pageParam as string | null);
      }
      return fetchUserPostsFromFirestore(userId, pageParam as QueryDocumentSnapshot<DocumentData> | null);
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
    .select('*')
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

  const posts = (data || []).map((row) => ({
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    content: row.content || '',
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: new Date(row.created_at),
    countOfComments: row.count_of_comments,
    countOfReplies: row.count_of_replies,
    countOfLikes: row.count_of_likes,
    engagementScore: row.engagement_score,
    weekDaysFromFirstDay: row.week_days_from_first_day,
    _paginationCursor: row.created_at,
    _fetchedFullPage: data.length === LIMIT_COUNT,
  })) as PostWithPaginationMetadata[];

  return posts;
}

/**
 * Original Firestore implementation
 */
async function fetchUserPostsFromFirestore(
  userId: string,
  paginationCursor: QueryDocumentSnapshot<DocumentData> | null
): Promise<PostWithPaginationMetadata[]> {
  try {
    const postingsRef = collection(firestore, 'users', userId, 'postings');

    let postingsQuery = query(postingsRef, orderBy('createdAt', 'desc'), limit(LIMIT_COUNT));

    if (paginationCursor) {
      postingsQuery = query(postingsQuery, startAfter(paginationCursor));
    }

    const postingsSnapshot = await getDocs(postingsQuery);
    const fetchedPostingCount = postingsSnapshot.docs.length;
    const fetchedFullPage = fetchedPostingCount === LIMIT_COUNT;

    const postsWithMetadata = await Promise.all(
      postingsSnapshot.docs.map(async (postingDoc) => {
        const posting = postingDoc.data() as Posting;
        const { board, post: postInfo } = posting;

        try {
          const postRef = doc(firestore, 'boards', board.id, 'posts', postInfo.id);
          const postDoc = await getDoc(postRef);

          if (!postDoc.exists()) {
            console.warn(`Post ${postInfo.id} not found in board ${board.id}`);
            return null;
          }

          const post = mapDocumentToPost(postDoc);

          return {
            ...post,
            _paginationCursor: postingDoc,
            _fetchedFullPage: fetchedFullPage,
          } as PostWithPaginationMetadata;
        } catch (error) {
          console.error(`Error fetching post ${postInfo.id}:`, error);
          return null;
        }
      })
    );

    return postsWithMetadata.filter((post): post is PostWithPaginationMetadata => post !== null);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    Sentry.captureException(error);
    return [];
  }
}
