import { Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import admin from "../admin";
import { Comment } from "../types/Comment";
import { Post } from "../types/Post";
import { Reply } from "../types/Reply";
import { Replying } from "../types/Replying";

export const createReplying = onDocumentCreated(
    'boards/{boardId}/posts/{postId}/comments/{commentId}/replies/{replyId}',
    async (event) => {
        const replyData = event.data?.data() as Reply;
        if (!replyData) {
            console.error('No reply data found.');
            return null;
        }

        // 필요한 필드 추출
        const boardId = event.params.boardId;
        const postId = event.params.postId;
        const commentId = event.params.commentId;
        const replyId = event.params.replyId;
        const authorId = replyData.userId;
        const createdAt = replyData.createdAt;

        if (!authorId) {
            console.error('Reply is missing an authorId.');
            return null;
        }

        try {
            // 게시글 정보 가져오기
            const postDoc = await admin.firestore()
                .collection('boards')
                .doc(boardId)
                .collection('posts')
                .doc(postId)
                .get();

            const postData = postDoc.data() as Post;
            if (!postData) {
                console.error('Post data not found.');
                return null;
            }

            // 댓글 정보 가져오기
            const commentDoc = await admin.firestore()
                .collection('boards')
                .doc(boardId)
                .collection('posts')
                .doc(postId)
                .collection('comments')
                .doc(commentId)
                .get();

            const commentData = commentDoc.data() as Comment;
            if (!commentData) {
                console.error('Comment data not found.');
                return null;
            }

            // Replying 데이터 모델 생성
            const replyingData: Replying = {
                board: { id: boardId },
                post: { 
                    id: postId, 
                    title: postData.title,
                    authorId: postData.authorId
                },
                comment: { 
                    id: commentId,
                    authorId: commentData.userId
                },
                reply: { id: replyId },
                createdAt: createdAt || Timestamp.now()
            };

            // 사용자의 replyings 서브컬렉션에 기록
            await admin.firestore()
                .collection('users')
                .doc(authorId)
                .collection('replyings')
                .add(replyingData);

            console.log(`Created replying activity for user ${authorId} for reply ${replyId}`);
        } catch (error) {
            console.error('Error writing replying activity:', error);
        }

        return null;
    }
);
