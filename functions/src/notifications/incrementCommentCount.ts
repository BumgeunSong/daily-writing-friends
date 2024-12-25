import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/firestore";
import admin from "../admin";

// 댓글 생성 시
export const onCommentCreated = onDocumentCreated(  
    "boards/{boardId}/posts/{postId}/comments/{commentId}",
    async (event) => {
        await incrementCommentCount(event.params.boardId, event.params.postId, 1);
    }
);

// 댓글 삭제 시
export const onCommentDeleted = onDocumentDeleted(  
    "boards/{boardId}/posts/{postId}/comments/{commentId}",
    async (event) => {
        await incrementCommentCount(event.params.boardId, event.params.postId, -1);
    }
);

// Post 문서 업데이트
export async function incrementCommentCount(
    boardId: string,
    postId: string,
    increment: number
  ): Promise<void> {
    try { 
      await admin.firestore().doc(`boards/${boardId}/posts/${postId}`).update({
        countOfComments: admin.firestore.FieldValue.increment(increment)
      });
  
      console.info(`Updated comment count for post ${boardId}/${postId} by ${increment}`);
    } catch (error) {
      console.error('Error updating comment count:', error);
      throw error;
    }
}
