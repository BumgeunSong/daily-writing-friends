import * as Sentry from '@sentry/react';
import { useInfiniteQuery } from "@tanstack/react-query";
import { limit, query, collection, orderBy, where, getDocs, startAfter } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { firestore } from "@/firebase";

const LIMIT_COUNT = 10;

export interface UserCommentReply {
  type: 'comment' | 'reply';
  content: string;
  postTitle: string;
  url: string;
  createdAt: Timestamp;
}

/**
 * 특정 사용자가 작성한 댓글과 답글을 가져오는 커스텀 훅
 * @param userId 사용자 ID
 * @returns InfiniteQuery 객체
 */
export const useUserCommentsReplies = (userId: string) => {
    return useInfiniteQuery<UserCommentReply[]>(
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
 * @returns 댓글/답글 배열
 */
async function fetchUserCommentsReplies(userId: string, after?: Timestamp): Promise<UserCommentReply[]> {
    try {
        // 사용자의 댓글 내역 가져오기
        const commentingsRef = collection(firestore, `users/${userId}/commentings`);
        let commentingsQuery = query(
            commentingsRef,
            orderBy('createdAt', 'desc'),
            limit(LIMIT_COUNT)
        );
        
        if (after) {
            commentingsQuery = query(commentingsQuery, startAfter(after));
        }
        
        const commentingsSnapshot = await getDocs(commentingsQuery);
        
        // 사용자의 답글 내역 가져오기
        const replyingsRef = collection(firestore, `users/${userId}/replyings`);
        let replyingsQuery = query(
            replyingsRef,
            orderBy('createdAt', 'desc'),
            limit(LIMIT_COUNT)
        );
        
        if (after) {
            replyingsQuery = query(replyingsQuery, startAfter(after));
        }
        
        const replyingsSnapshot = await getDocs(replyingsQuery);
        
        const results: UserCommentReply[] = [];
        
        // 댓글 처리
        for (const doc of commentingsSnapshot.docs) {
            const data = doc.data();
            const commentRef = collection(firestore, 
                `boards/${data.board.id}/posts/${data.post.id}/comments`);
            const commentDoc = await getDocs(query(commentRef, where('id', '==', data.comment.id)));
            
            if (!commentDoc.empty) {
                const commentData = commentDoc.docs[0].data();
                results.push({
                    type: 'comment',
                    content: commentData.content,
                    postTitle: data.post.title,
                    url: `/board/${data.board.id}/post/${data.post.id}`,
                    createdAt: data.createdAt
                });
            }
        }
        
        // 답글 처리
        for (const doc of replyingsSnapshot.docs) {
            const data = doc.data();
            const replyRef = collection(firestore, 
                `boards/${data.board.id}/posts/${data.post.id}/comments/${data.comment.id}/replies`);
            const replyDoc = await getDocs(query(replyRef, where('id', '==', data.reply.id)));
            
            if (!replyDoc.empty) {
                const replyData = replyDoc.docs[0].data();
                results.push({
                    type: 'reply',
                    content: replyData.content,
                    postTitle: data.post.title,
                    url: `/board/${data.board.id}/post/${data.post.id}`,
                    createdAt: data.createdAt
                });
            }
        }
        
        // 날짜순 정렬
        results.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        return results;
    } catch (error) {
        console.error("Error fetching user comments and replies:", error);
        Sentry.captureException(error);
        return [];
    }
} 