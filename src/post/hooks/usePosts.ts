import * as Sentry from '@sentry/react';
import { useInfiniteQuery } from "@tanstack/react-query";
import { limit, query, collection, orderBy, getDocs, startAfter, where } from "firebase/firestore";
import { firestore } from "@/firebase";
import { Post } from '@/post/model/Post';
import { mapDocumentToPost } from '@/post/utils/postUtils';

/**
 * 게시글 목록을 불러오는 커스텀 훅 (blockedUsers 필터링 지원)
 * @param boardId 게시판 ID
 * @param limitCount 페이지당 글 개수
 * @param blockedUsers 내 컨텐츠 숨김 유저 uid 배열 (authorId not-in)
 */
export const usePosts = (
    boardId: string,
    limitCount: number,
    blockedUsers: string[] = []
) => {
    return useInfiniteQuery<Post[]>(
        ['posts', boardId, blockedUsers],
        ({ pageParam = null }) => fetchPosts(boardId, limitCount, blockedUsers, pageParam),
        {
            enabled: !!boardId,
            getNextPageParam: (lastPage) => {
                const lastPost = lastPage[lastPage.length - 1];
                return lastPost ? lastPost.createdAt?.toDate() : undefined;
            },
            onError: (error) => {
                console.error("게시글 데이터를 불러오던 중 에러가 발생했습니다:", error);
                Sentry.captureException(error);
            },
            staleTime: 1000 * 30, // 30 seconds
            cacheTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: true, // Refetch when the window regains focus
        }
    );
};

/**
 * Firestore에서 게시글을 불러옴 (blockedUsers 필터링)
 * @param boardId
 * @param limitCount
 * @param blockedUsers
 * @param after
 * @returns Post[]
 */
async function fetchPosts(
    boardId: string,
    limitCount: number,
    blockedUsers: string[] = [],
    after?: Date
): Promise<Post[]> {
    let q = query(
        collection(firestore, `boards/${boardId}/posts`),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    // Firestore not-in 조건은 10개 이하만 지원
    if (blockedUsers.length > 0 && blockedUsers.length <= 10) {
        q = query(
            collection(firestore, `boards/${boardId}/posts`),
            where('authorId', 'not-in', blockedUsers),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
    }
    // 10개 초과 시 전체 글 반환 (제약)

    if (after) {
        q = query(q, startAfter(after));
    }

    const snapshot = await getDocs(q);
    const postsData = snapshot.docs.map(doc => mapDocumentToPost(doc));
    return postsData;
}