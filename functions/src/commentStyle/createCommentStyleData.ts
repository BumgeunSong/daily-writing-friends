import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { runtimeOptions } from "./config";
import { CommentStyleData } from "./types";
import { isActiveUser } from "./userUtils";
import admin from "../shared/admin";
import { Comment } from "../shared/types/Comment";
import { Post } from "../shared/types/Post";

/**
 * 새 댓글이 생성될 때 CommentStyleData를 자동으로 생성하는 Cloud Function
 * 
 * 처리 과정:
 * 1. 댓글 작성자가 활성 사용자인지 확인
 * 2. 포스트 처리 캐시 확인
 * 3. 캐시가 없으면 Gemini로 포스트 분석 (summary, tone, mood)
 * 4. CommentStyleData 레코드 생성
 * 5. 포스트 분석 결과를 캐시에 저장
 */
export const createCommentStyleData = onDocumentCreated({
  document: 'boards/{boardId}/posts/{postId}/comments/{commentId}',
  ...runtimeOptions
}, async (event) => {
  try {
    const { boardId, postId, commentId } = event.params;
    const commentData = event.data?.data() as Comment;
    
    if (!commentData) {
      console.error('No comment data found in event');
      return;
    }

    const userId = commentData.userId;
    
    console.log(`Processing comment ${commentId} by user ${userId} on post ${postId}`);

    // 1. 사용자가 활성 사용자인지 확인
    const isActive = await isActiveUser(userId, boardId);
    if (!isActive) {
      console.log(`User ${userId} is not active for board ${boardId}, skipping processing`);
      return;
    }

    // 2. 포스트 데이터 조회
    const postDoc = await admin.firestore()
      .doc(`boards/${boardId}/posts/${postId}`)
      .get();

    if (!postDoc.exists) {
      console.error(`Post ${postId} not found`);
      return;
    }

    const postData = postDoc.data() as Post;

    // 3. 셀프 댓글인 경우 제외 (본인 포스트에 본인이 댓글)
    if (postData.authorId === userId) {
      console.log(`Skipping self-comment: user ${userId} commenting on own post ${postId}`);
      return;
    }

    // 4. CommentStyleData 레코드 생성 (포스트 분석 없이 댓글만 저장)
    const commentStyleData: CommentStyleData = {
      id: commentId,
      userId: userId,
      postId: postId,
      boardId: boardId,
      authorId: postData.authorId,
      authorNickname: postData.authorName,
      userComment: commentData.content,
      createdAt: commentData.createdAt || admin.firestore.Timestamp.now(),
      processedAt: admin.firestore.Timestamp.now()
    };

    // 8. Firestore에 사용자 하위 컬렉션으로 저장
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('commentStyleData')
      .add(commentStyleData);

    console.log(`Successfully created commentStyleData for comment ${commentId} under user ${userId}`);
    console.log(`Analysis: tone=${analysis.tone}, mood=${analysis.mood}, summary="${analysis.summary}"`);

  } catch (error) {
    console.error('Error in createCommentStyleData:', error);
    
    // 에러 발생 시에도 함수가 실패하지 않도록 처리
    // 댓글 생성 자체에는 영향을 주지 않아야 함
  }
});