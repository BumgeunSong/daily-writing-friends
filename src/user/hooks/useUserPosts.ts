import * as Sentry from '@sentry/react';
import { useInfiniteQuery } from "@tanstack/react-query";
import { limit, query, collection, orderBy, getDocs, startAfter, doc, getDoc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { firestore } from "@/firebase";
import { Post } from "@/post/model/Post";
import { Posting } from "@/post/model/Posting";

const LIMIT_COUNT = 10;

type PostWithPaginationMetadata = Post & {
    _paginationCursor?: QueryDocumentSnapshot<DocumentData>;
    _fetchedFullPage?: boolean;
};

/**
 * 특정 사용자가 작성한 포스트를 가져오는 커스텀 훅
 * Optimized to use users/{userId}/postings subcollection instead of querying all boards
 * @param userId 사용자 ID
 * @returns InfiniteQuery 객체
 */
export const useUserPosts = (userId: string) => {
    return useInfiniteQuery<PostWithPaginationMetadata[]>(
        ['userPosts', userId],
        ({ pageParam = null }) => fetchUserPosts(userId, pageParam),
        {
            enabled: !!userId,
            getNextPageParam: (lastPage) => {
                const lastPost = lastPage[lastPage.length - 1];
                const shouldFetchNextPage = lastPost?._fetchedFullPage && lastPost?._paginationCursor;

                return shouldFetchNextPage ? lastPost._paginationCursor : undefined;
            },
            onError: (error) => {
                console.error("사용자 게시글을 불러오던 중 에러가 발생했습니다:", error);
                Sentry.captureException(error);
            },
            staleTime: 1000 * 60, // 1분
            cacheTime: 1000 * 60 * 5, // 5분
            refetchOnWindowFocus: false,
        }
    );
};

/**
 * 사용자의 게시글을 페이지 단위로 가져오는 함수
 * Uses users/{userId}/postings subcollection for efficient querying
 * @param userId 사용자 ID
 * @param paginationCursor 마지막 문서 (페이지네이션 용)
 * @returns 게시글 배열
 */
async function fetchUserPosts(userId: string, paginationCursor?: QueryDocumentSnapshot<DocumentData>): Promise<PostWithPaginationMetadata[]> {
    try {
        const postingsRef = collection(firestore, 'users', userId, 'postings');

        let postingsQuery = query(
            postingsRef,
            orderBy('createdAt', 'desc'),
            limit(LIMIT_COUNT)
        );

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

                    const postData = postDoc.data();

                    return {
                        id: postDoc.id,
                        boardId: board.id,
                        title: postData.title,
                        content: postData.content,
                        authorId: postData.authorId,
                        authorName: postData.authorName,
                        createdAt: postData.createdAt,
                        updatedAt: postData.updatedAt,
                        visibility: postData.visibility,
                        countOfComments: postData.countOfComments || 0,
                        countOfReplies: postData.countOfReplies || 0,
                        _paginationCursor: postingDoc,
                        _fetchedFullPage: fetchedFullPage,
                    } as PostWithPaginationMetadata;
                } catch (error) {
                    console.error(`Error fetching post ${postInfo.id}:`, error);
                    return null;
                }
            })
        );

        const validPosts = postsWithMetadata.filter((post): post is PostWithPaginationMetadata => post !== null);
        return validPosts;
    } catch (error) {
        console.error("Error fetching user posts:", error);
        Sentry.captureException(error);
        return [];
    }
} 