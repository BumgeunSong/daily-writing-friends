import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { CacheService } from "./cacheService";
import { runtimeOptions } from "./config";
import { GeminiService } from "./geminiService";
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

    // 3. 캐시 서비스 및 Gemini 서비스 초기화
    const cacheService = new CacheService();
    let analysis = await cacheService.getCachedPostProcessing(postId);

    if (!analysis) {
      console.log(`No cache found for post ${postId}, calling Gemini API`);
      
      // 4. Gemini로 포스트 분석
      const geminiService = new GeminiService();
      const result = await geminiService.generateSummaryToneMood(postData.content);
      
      analysis = {
        summary: result.summary,
        tone: result.tone,
        mood: result.mood
      };

      // 5. 분석 결과를 캐시에 저장
      await cacheService.cachePostProcessing(postId, analysis);
      console.log(`Cached analysis result for post ${postId}`);
    } else {
      console.log(`Using cached analysis for post ${postId}`);
    }

    // 6. CommentStyleData 레코드 생성
    const commentStyleData: CommentStyleData = {
      id: commentId,
      userId: userId,
      postId: postId,
      boardId: boardId,
      postSummary: analysis.summary,
      postTone: analysis.tone,
      postMood: analysis.mood,
      userComment: commentData.content,
      createdAt: commentData.createdAt || admin.firestore.Timestamp.now(),
      processedAt: admin.firestore.Timestamp.now()
    };

    // 7. Firestore에 사용자 하위 컬렉션으로 저장
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