import * as Sentry from '@sentry/react';
import { useInfiniteQuery } from "@tanstack/react-query";
import { limit, query, collection, orderBy, getDocs, startAfter } from "firebase/firestore";
import { firestore } from "@/firebase";
import { Post } from '@/post/model/Post';
import { mapDocumentToPost } from '@/post/utils/postUtils';

export const usePosts = (boardId: string, limitCount: number) => {
    return useInfiniteQuery<Post[]>(
        ['posts', boardId],
        ({ pageParam = null }) => fetchPosts(boardId, limitCount, pageParam),
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

async function fetchPosts(boardId: string, limitCount: number, after?: Date): Promise<Post[]> {
    let q = query(
        collection(firestore, `boards/${boardId}/posts`),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    if (after) {
        q = query(q, startAfter(after));
    }

    const snapshot = await getDocs(q);
    const postsData = snapshot.docs.map(doc => mapDocumentToPost(doc));
    return postsData;
}