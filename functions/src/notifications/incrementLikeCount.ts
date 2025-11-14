import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/firestore';
import admin from '../shared/admin';

// 좋아요 생성 시
export const incrementLikeCountOnLikeCreated = onDocumentCreated(
  'boards/{boardId}/posts/{postId}/likes/{likeId}',
  async (event) => {
    await incrementLikeCount(event.params.boardId, event.params.postId, 1);
  },
);

// 좋아요 삭제 시
export const decrementLikeCountOnLikeDeleted = onDocumentDeleted(
  'boards/{boardId}/posts/{postId}/likes/{likeId}',
  async (event) => {
    await incrementLikeCount(event.params.boardId, event.params.postId, -1);
  },
);

// Post 문서 업데이트
async function incrementLikeCount(
  boardId: string,
  postId: string,
  increment: number,
): Promise<void> {
  try {
    await admin
      .firestore()
      .doc(`boards/${boardId}/posts/${postId}`)
      .update({
        countOfLikes: admin.firestore.FieldValue.increment(increment),
      });

    console.info(`Updated like count for post ${boardId}/${postId} by ${increment}`);
  } catch (error) {
    console.error('Error updating like count:', error);
    throw error;
  }
}
