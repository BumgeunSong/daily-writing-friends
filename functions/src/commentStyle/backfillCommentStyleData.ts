import { onRequest } from "firebase-functions/v2/https";
import { 
  getUserRecentCommentsWithPosts, 
  getUniquePostContents, 
  BackfillProgress 
} from "./backfillHelpers";
import { CacheService } from "./cacheService";
import { backfillRuntimeOptions, PROCESSING_LIMITS } from "./config";
import { GeminiService } from "./geminiService";
import { CommentStyleData, BackfillResult } from "./types";
import { getActiveUsers, getActiveBoardId } from "./userUtils";
import admin from "../shared/admin";

/**
 * 활성 사용자들의 기존 댓글에 대해 CommentStyleData를 백필하는 HTTP Cloud Function
 * 
 * 처리 과정:
 * 1. 활성 보드의 모든 활성 사용자 조회
 * 2. 각 사용자의 최근 10개 댓글과 해당 포스트 조회
 * 3. 고유한 포스트들에 대해 배치로 Gemini 분석 실행 (비용 절약)
 * 4. CommentStyleData 레코드 일괄 생성
 * 5. 포스트 분석 결과 캐시 저장
 */
export const backfillCommentStyleDataForActiveUsers = onRequest({
  ...backfillRuntimeOptions
}, async (req, res): Promise<void> => {
  console.log('Starting commentStyleData backfill for active users');
  
  let progress: BackfillProgress | undefined;
  
  try {
    // CORS 헤더 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // 1. 활성 보드 ID 조회
    const activeBoardId = await getActiveBoardId();
    if (!activeBoardId) {
      throw new Error('Active board ID not found');
    }

    console.log(`Active board ID: ${activeBoardId}`);

    // 2. 활성 사용자들 조회
    const activeUserIds = await getActiveUsers(activeBoardId);
    if (activeUserIds.length === 0) {
      res.json({
        success: true,
        message: 'No active users found',
        results: {
          totalUsers: 0,
          processedUsers: 0,
          totalComments: 0,
          errors: 0
        }
      });
      return;
    }

    console.log(`Found ${activeUserIds.length} active users`);
    progress = new BackfillProgress(activeUserIds.length);

    // 3. 사용자들을 배치로 처리 (타임아웃 방지)
    const results: BackfillResult[] = [];
    
    for (let i = 0; i < activeUserIds.length; i += PROCESSING_LIMITS.batchSize) {
      const userBatch = activeUserIds.slice(i, i + PROCESSING_LIMITS.batchSize);
      
      console.log(`Processing user batch ${Math.floor(i / PROCESSING_LIMITS.batchSize) + 1}/${Math.ceil(activeUserIds.length / PROCESSING_LIMITS.batchSize)}: ${userBatch.length} users`);
      
      // 배치 내 사용자들을 병렬로 처리
      const batchPromises = userBatch.map(userId => 
        processUserCommentsWithToneMood(userId, activeBoardId)
          .then(result => {
            progress.incrementProcessedUsers();
            progress.addProcessedComments(result.commentsProcessed);
            return result;
          })
          .catch(error => {
            progress.incrementProcessedUsers();
            progress.addError(`User ${userId}: ${error.message}`);
            return {
              userId,
              commentsProcessed: 0,
              success: false,
              error: error.message
            } as BackfillResult;
          })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      progress.logProgress();
      
      // 배치 간 짧은 대기 (API 레이트 리미트 고려)
      if (i + PROCESSING_LIMITS.batchSize < activeUserIds.length) {
        await delay(2000);
      }
    }

    // 4. 결과 정리 및 응답
    const finalProgress = progress.getProgress();
    const successCount = results.filter(r => r.success).length;
    const totalCommentsProcessed = results.reduce((sum, r) => sum + r.commentsProcessed, 0);

    console.log('Backfill completed:', {
      totalUsers: activeUserIds.length,
      successfulUsers: successCount,
      totalCommentsProcessed,
      errors: finalProgress.errors
    });

    res.json({
      success: finalProgress.success,
      message: `Backfill completed for ${activeUserIds.length} users`,
      results: {
        totalUsers: activeUserIds.length,
        processedUsers: finalProgress.processedUsers,
        successfulUsers: successCount,
        totalComments: totalCommentsProcessed,
        errors: finalProgress.errors,
        errorDetails: results.filter(r => !r.success).map(r => ({ userId: r.userId, error: r.error }))
      }
    });
    return;

  } catch (error) {
    console.error('Backfill error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results: progress ? progress.getProgress() : null
    });
    return;
  }
});

/**
 * 개별 사용자의 댓글들에 대해 CommentStyleData 생성
 */
async function processUserCommentsWithToneMood(
  userId: string, 
  activeBoardId: string
): Promise<BackfillResult> {
  try {
    console.log(`Processing comments for user ${userId}`);

    // 1. 사용자의 최근 댓글들과 포스트 데이터 조회
    const commentsWithPosts = await getUserRecentCommentsWithPosts(
      userId, 
      PROCESSING_LIMITS.maxCommentsPerUser
    );

    if (commentsWithPosts.length === 0) {
      console.log(`No comments found for user ${userId}`);
      return {
        userId,
        commentsProcessed: 0,
        success: true
      };
    }

    // 2. 고유한 포스트들만 추출 (중복 LLM 호출 방지)
    const uniquePosts = getUniquePostContents(commentsWithPosts);
    console.log(`User ${userId}: ${commentsWithPosts.length} comments on ${uniquePosts.length} unique posts`);

    // 3. Gemini 배치 분석 수행
    const geminiService = new GeminiService();
    const postAnalyses = await geminiService.batchProcessSummaryToneMood(
      uniquePosts.map(p => p.content)
    );

    // 4. 포스트 ID별 분석 결과 매핑 생성
    const analysisMap = new Map();
    uniquePosts.forEach((post, index) => {
      analysisMap.set(post.postId, postAnalyses[index]);
    });

    // 5. CommentStyleData 레코드들을 배치로 생성
    const batch = admin.firestore().batch();
    const timestamp = admin.firestore.Timestamp.now();

    commentsWithPosts.forEach(comment => {
      const analysis = analysisMap.get(comment.postId);
      
      if (!analysis) {
        console.warn(`No analysis found for post ${comment.postId}, skipping comment ${comment.commentId}`);
        return;
      }

      const commentStyleData: CommentStyleData = {
        id: comment.commentId,
        userId: userId,
        postId: comment.postId,
        boardId: comment.boardId,
        postSummary: analysis.summary,
        postTone: analysis.tone,
        postMood: analysis.mood,
        userComment: comment.commentContent,
        createdAt: comment.createdAt,
        processedAt: timestamp
      };

      const docRef = admin.firestore().collection('commentStyleData').doc();
      batch.set(docRef, commentStyleData);
    });

    // 6. 배치 실행
    await batch.commit();

    // 7. 포스트 분석 결과를 캐시에 저장
    const cacheService = new CacheService();
    const cacheData = uniquePosts.map(post => ({
      postId: post.postId,
      summary: analysisMap.get(post.postId).summary,
      tone: analysisMap.get(post.postId).tone,
      mood: analysisMap.get(post.postId).mood
    }));
    
    await cacheService.batchCachePostProcessing(cacheData);

    console.log(`Successfully processed ${commentsWithPosts.length} comments for user ${userId}`);

    return {
      userId,
      commentsProcessed: commentsWithPosts.length,
      success: true
    };

  } catch (error) {
    console.error(`Error processing user ${userId}:`, error);
    return {
      userId,
      commentsProcessed: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 지연 유틸리티
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}