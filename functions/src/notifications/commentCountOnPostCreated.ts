import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/firestore';
import { onDocumentDeleted } from 'firebase-functions/firestore';

// 댓글 수 계산
async function getCommentCount(commentsRef: FirebaseFirestore.CollectionReference): Promise<number> {
  const snapshot = await commentsRef.count().get();
  return snapshot.data().count;
}

// 특정 댓글의 답글 수 계산
async function getReplyCount(commentRef: FirebaseFirestore.DocumentReference): Promise<number> {
  const replyRef = commentRef.collection('replies');
  const snapshot = await replyRef.count().get();
  return snapshot.data().count;
}

// 전체 답글 수 계산
async function getTotalReplyCount(commentsRef: FirebaseFirestore.CollectionReference): Promise<number> {
  const commentsSnapshot = await commentsRef.get();
  
  const replyCounts = await Promise.all(
    commentsSnapshot.docs.map(commentDoc => 
      getReplyCount(commentsRef.doc(commentDoc.id))
    )
  );
  
  return replyCounts.reduce((total, count) => total + count, 0);
}

// 총 댓글 수 계산 (댓글 + 답글)
async function calculateTotalComments(boardId: string, postId: string): Promise<number> {
    const postPath = `boards/${boardId}/posts/${postId}`;
  const commentsRef = admin.firestore().collection(postPath + '/comments');
  
  const [commentCount, replyCount] = await Promise.all([
    getCommentCount(commentsRef),
    getTotalReplyCount(commentsRef)
  ]);
  
  return commentCount + replyCount;
}

// Post 문서 업데이트
async function updatePostCommentCount(boardId: string, postId: string): Promise<void> {
  try {
    const totalComments = await calculateTotalComments(boardId, postId);
    
    await admin.firestore().doc(`boards/${boardId}/posts/${postId}`).update({
      comments: totalComments
    });
        
    console.info(`Updated comment count for post ${boardId}/${postId}: ${totalComments}`);
  } catch (error) {
    console.error('Error updating comment count:', error);
    throw error;
  }
}

// Cloud Functions 트리거
export const onPostCreated = onDocumentCreated(
    "boards/{boardId}/posts/{postId}",
    async (event) => {
        await updatePostCommentCount(event.params.boardId, event.params.postId);
    }
);

export const onCommentCreated = onDocumentCreated(
    "boards/{boardId}/posts/{postId}/comments/{commentId}",
    async (event) => {
        await updatePostCommentCount(event.params.boardId, event.params.postId);
    }
);

export const onCommentDeleted = onDocumentDeleted(
    "boards/{boardId}/posts/{postId}/comments/{commentId}",
    async (event) => {
        await updatePostCommentCount(event.params.boardId, event.params.postId);
    }
);

export const onReplyCreated = onDocumentCreated(
    "boards/{boardId}/posts/{postId}/comments/{commentId}/replies/{replyId}",
    async (event) => {
        await updatePostCommentCount(event.params.boardId, event.params.postId);
    }
);
    

export const onReplyDeleted = onDocumentDeleted(
    "boards/{boardId}/posts/{postId}/comments/{commentId}/replies/{replyId}",
    async (event) => {
        await updatePostCommentCount(event.params.boardId, event.params.postId);
    }
);