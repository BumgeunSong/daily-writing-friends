import { DocumentData, limit, QueryDocumentSnapshot } from "firebase/firestore";
import { query, collection, orderBy, where, getDocs, startAfter } from "firebase/firestore";
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
                return lastPost ? lastPost.createdAt : undefined;
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
    const postsData = await Promise.all(snapshot.docs.map((doc) => mapDocToPost(doc, boardId)));
    return postsData;
}

async function mapDocToPost(docSnap: QueryDocumentSnapshot<DocumentData>, boardId: string): Promise<Post> {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        boardId: data.boardId,
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        comments: await getCommentsCount(boardId, docSnap.id),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
    };
}

async function getCommentsCount(boardId: string, postId: string): Promise<number> {
    const commentsSnapshot = await getDocs(collection(firestore, `boards/${boardId}/posts/${postId}/comments`));
    const commentsCount = await Promise.all(
        commentsSnapshot.docs.map(async (comment) => {
            const repliesSnapshot = await getDocs(
                collection(firestore, `boards/${boardId}/posts/${postId}/comments/${comment.id}/replies`),
            );
            return Number(comment.exists()) + repliesSnapshot.docs.length;
        }),
    );
    return commentsCount.reduce((acc, curr) => acc + curr, 0);
}