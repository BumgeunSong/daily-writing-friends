import * as Sentry from '@sentry/react';
import { useInfiniteQuery } from "@tanstack/react-query";
import { limit, query, collection, orderBy, where, getDocs, startAfter } from "firebase/firestore";
import { firestore } from "@/firebase";
import { Post } from "@/types/Post";
import { mapDocumentToPost } from "@/utils/postUtils";

const LIMIT_COUNT = 10;

/**
 * 특정 사용자가 작성한 포스트를 가져오는 커스텀 훅
 * @param userId 사용자 ID
 * @returns InfiniteQuery 객체
 */
export const useUserPosts = (userId: string) => {
    return useInfiniteQuery<Post[]>(
        ['userPosts', userId],
        ({ pageParam = null }) => fetchUserPosts(userId, pageParam),
        {
            enabled: !!userId,
            getNextPageParam: (lastPage) => {
                if (lastPage.length === 0) return undefined;
                const lastPost = lastPage[lastPage.length - 1];
                return lastPost ? lastPost.createdAt?.toDate() : undefined;
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
 * @param userId 사용자 ID
 * @param after 마지막 문서의 timestamp (페이지네이션 용)
 * @returns 게시글 배열
 */
async function fetchUserPosts(userId: string, after?: Date): Promise<Post[]> {
    try {
        // 모든 게시판에서 사용자가 작성한 글 가져오기
        // 실제 환경에서는 boards 컬렉션을 먼저 가져와서 각 게시판 ID를 순회해야 할 수 있음
        const boardsRef = collection(firestore, "boards");
        const boardsSnapshot = await getDocs(boardsRef);
        
        let allPosts: Post[] = [];
        
        // 각 게시판에서 사용자의 게시글 가져오기
        for (const boardDoc of boardsSnapshot.docs) {
            const boardId = boardDoc.id;
            
            let q = query(
                collection(firestore, `boards/${boardId}/posts`),
                where('authorId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(LIMIT_COUNT)
            );
            
            if (after) {
                q = query(q, startAfter(after));
            }
            
            const postsSnapshot = await getDocs(q);
            const boardPosts = postsSnapshot.docs.map(doc => ({
                ...mapDocumentToPost(doc),
                boardId, // 게시판 ID 추가
                boardTitle: boardDoc.data().title || '게시판' // 게시판 제목 추가
            }));
            
            allPosts = [...allPosts, ...boardPosts];
        }
        
        // 전체 결과를 날짜 순으로 정렬
        allPosts.sort((a, b) => {
            const dateA = a.createdAt?.toDate() || new Date(0);
            const dateB = b.createdAt?.toDate() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
        
        // 요청된 개수만큼 자르기
        return allPosts.slice(0, LIMIT_COUNT);
    } catch (error) {
        console.error("Error fetching user posts:", error);
        Sentry.captureException(error);
        return [];
    }
} 