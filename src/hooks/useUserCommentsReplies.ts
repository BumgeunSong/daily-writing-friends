import { limit, query, collection, orderBy, where, getDocs, startAfter } from "firebase/firestore";
import { firestore } from "@/firebase";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as Sentry from '@sentry/react';

const LIMIT_COUNT = 10;

export interface UserComment {
  id: string;
  content: string;
  createdAt: Date;
  postId: string;
  postTitle: string;
  boardId: string;
  boardTitle: string;
  isReply: boolean;
}

/**
 * 특정 사용자가 작성한 댓글과 답글을 가져오는 커스텀 훅
 * @param userId 사용자 ID
 * @returns InfiniteQuery 객체
 */
export const useUserCommentsReplies = (userId: string) => {
    return useInfiniteQuery<UserComment[]>(
        ['userComments', userId],
        ({ pageParam = null }) => fetchUserCommentsReplies(userId, pageParam),
        {
            enabled: !!userId,
            getNextPageParam: (lastPage) => {
                if (lastPage.length === 0) return undefined;
                const lastComment = lastPage[lastPage.length - 1];
                return lastComment ? lastComment.createdAt : undefined;
            },
            onError: (error) => {
                console.error("사용자 댓글을 불러오던 중 에러가 발생했습니다:", error);
                Sentry.captureException(error);
            },
            staleTime: 1000 * 60, // 1분
            cacheTime: 1000 * 60 * 5, // 5분
            refetchOnWindowFocus: false,
        }
    );
};

/**
 * 사용자의 댓글과 답글을 페이지 단위로 가져오는 함수
 * @param userId 사용자 ID
 * @param after 마지막 문서의 timestamp (페이지네이션 용)
 * @returns 댓글 배열
 */
async function fetchUserCommentsReplies(userId: string, after?: Date): Promise<UserComment[]> {
    try {
        // 모든 게시판 가져오기
        const boardsRef = collection(firestore, "boards");
        const boardsSnapshot = await getDocs(boardsRef);
        
        let allComments: UserComment[] = [];
        
        // 각 게시판에서 사용자의 댓글 가져오기
        for (const boardDoc of boardsSnapshot.docs) {
            const boardId = boardDoc.id;
            const boardTitle = boardDoc.data().title || '게시판';
            
            // 게시글 가져오기
            const postsRef = collection(firestore, `boards/${boardId}/posts`);
            const postsSnapshot = await getDocs(postsRef);
            
            // 각 게시글에서 사용자의 댓글 및 답글 가져오기
            for (const postDoc of postsSnapshot.docs) {
                const postId = postDoc.id;
                const postTitle = postDoc.data().title || '제목 없음';
                
                // 댓글 가져오기
                let commentsQuery = query(
                    collection(firestore, `boards/${boardId}/posts/${postId}/comments`),
                    where('authorId', '==', userId),
                    orderBy('createdAt', 'desc'),
                    limit(LIMIT_COUNT)
                );
                
                if (after) {
                    commentsQuery = query(commentsQuery, startAfter(after));
                }
                
                const commentsSnapshot = await getDocs(commentsQuery);
                
                // 댓글 데이터 매핑
                const postComments = commentsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        content: data.content || '',
                        createdAt: data.createdAt?.toDate() || new Date(),
                        postId,
                        postTitle,
                        boardId,
                        boardTitle,
                        isReply: false
                    } as UserComment;
                });
                
                allComments = [...allComments, ...postComments];
                
                // 댓글에 달린 답글 가져오기
                for (const commentDoc of commentsSnapshot.docs) {
                    const commentId = commentDoc.id;
                    
                    let repliesQuery = query(
                        collection(firestore, `boards/${boardId}/posts/${postId}/comments/${commentId}/replies`),
                        where('authorId', '==', userId),
                        orderBy('createdAt', 'desc'),
                        limit(LIMIT_COUNT)
                    );
                    
                    if (after) {
                        repliesQuery = query(repliesQuery, startAfter(after));
                    }
                    
                    const repliesSnapshot = await getDocs(repliesQuery);
                    
                    // 답글 데이터 매핑
                    const commentReplies = repliesSnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            content: data.content || '',
                            createdAt: data.createdAt?.toDate() || new Date(),
                            postId,
                            postTitle,
                            boardId,
                            boardTitle,
                            isReply: true
                        } as UserComment;
                    });
                    
                    allComments = [...allComments, ...commentReplies];
                }
            }
        }
        
        // 전체 결과를 날짜 순으로 정렬
        allComments.sort((a, b) => {
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
        
        // 요청된 개수만큼 자르기
        return allComments.slice(0, LIMIT_COUNT);
    } catch (error) {
        console.error("Error fetching user comments and replies:", error);
        Sentry.captureException(error);
        return [];
    }
} 