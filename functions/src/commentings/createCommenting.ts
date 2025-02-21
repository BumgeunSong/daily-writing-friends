import { Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import admin from "../admin";
import { Comment } from "../types/Comment";
import { Commenting } from "../types/Commenting";
import { Post } from "../types/Post";
export const createCommenting = onDocumentCreated(
    'boards/{boardId}/posts/{postId}/comments/{commentId}',
    async (event) => {
        const commentData = event.data?.data() as Comment;
        if (!commentData) {
            console.error('No comment data found.');
            return null;
        }

        // 필요한 필드 추출
        const boardId = event.params.boardId;
        const postId = event.params.postId;
        const commentId = event.params.commentId;
        const authorId = commentData.userId;
        const createdAt = commentData.createdAt;

        if (!authorId) {
            console.error('Comment is missing an authorId.');
            return null;
        }

        // 게시글 정보 가져오기
        try {
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

            // Commenting 데이터 모델 생성
            const commentingData: Commenting = {
                board: { id: boardId },
                post: { 
                    id: postId, 
                    title: postData.title,
                    authorId: postData.authorId
                },
                comment: { id: commentId },
                createdAt: createdAt || Timestamp.now()
            };

            await admin.firestore()
                .collection('users')
                .doc(authorId)
                .collection('commentings')
                .add(commentingData);

            console.log(`Created commenting activity for user ${authorId} for comment ${commentId}`);
        } catch (error) {
            console.error('Error writing commenting activity:', error);
        }

        return null;
    }
);
