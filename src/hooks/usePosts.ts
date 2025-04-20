import { limit, query, collection, orderBy, where, getDocs, startAfter } from "firebase/firestore";
import { firestore } from "@/firebase";
import { Post } from "@/types/Posts";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as Sentry from '@sentry/react';

export const usePosts = (boardId: string, selectedAuthorId: string | null, limitCount: number) => {
    return useInfiniteQuery<Post[]>(
        ['posts', boardId, selectedAuthorId],
        ({ pageParam = null }) => fetchPosts(boardId, selectedAuthorId, limitCount, pageParam),
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

async function fetchPosts(boardId: string, selectedAuthorId: string | null, limitCount: number, after?: Date): Promise<Post[]> {
    let q = query(
        collection(firestore, `boards/${boardId}/posts`),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    if (selectedAuthorId) {
        q = query(q, where('authorId', '==', selectedAuthorId));
    }

    if (after) {
        q = query(q, startAfter(after));
    }

    const snapshot = await getDocs(q);
    const postsData = await Promise.all(snapshot.docs.map((doc) => doc.data() as Post));
    return postsData;
}