import { PostProcessingCache, PostTone, PostMood } from './types';
import admin from '../shared/admin';

/**
 * 포스트 처리 결과 캐싱 서비스
 * 동일한 포스트에 대한 중복 LLM 호출을 방지하여 비용 절약
 */
export class CacheService {
  /**
   * 캐시된 포스트 처리 결과 조회
   */
  async getCachedPostProcessing(postId: string): Promise<{
    summary: string;
    tone: PostTone;
    mood: PostMood;
  } | null> {
    try {
      const doc = await admin.firestore()
        .collection('caches')
        .doc('postSummaries')
        .collection('summaries')
        .doc(postId)
        .get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data() as PostProcessingCache;

      return {
        summary: data.summary,
        tone: data.tone,
        mood: data.mood,
      };
    } catch (error) {
      console.error(`Error getting cached post processing for ${postId}:`, error);
      return null;
    }
  }

  /**
   * 포스트 처리 결과를 캐시에 저장
   */
  async cachePostProcessing(
    postId: string,
    analysis: { summary: string; tone: PostTone; mood: PostMood },
  ): Promise<void> {
    try {
      const cacheData: PostProcessingCache = {
        postId,
        summary: analysis.summary,
        tone: analysis.tone,
        mood: analysis.mood,
        processedAt: admin.firestore.Timestamp.now(),
      };

      await admin.firestore()
        .collection('caches')
        .doc('postSummaries')
        .collection('summaries')
        .doc(postId)
        .set(cacheData);

      console.log(`Cached post processing result for ${postId}`);
    } catch (error) {
      console.error(`Error caching post processing for ${postId}:`, error);
      // 캐시 실패는 치명적이지 않으므로 에러를 던지지 않음
    }
  }

  /**
   * 배치 캐싱 - 여러 포스트의 처리 결과를 한 번에 캐시
   */
  async batchCachePostProcessing(
    results: Array<{
      postId: string;
      summary: string;
      tone: PostTone;
      mood: PostMood;
    }>,
  ): Promise<void> {
    if (results.length === 0) return;

    try {
      const batch = admin.firestore().batch();
      const timestamp = admin.firestore.Timestamp.now();

      results.forEach((result) => {
        const cacheRef = admin.firestore()
          .collection('caches')
          .doc('postSummaries')
          .collection('summaries')
          .doc(result.postId);

        const cacheData: PostProcessingCache = {
          postId: result.postId,
          summary: result.summary,
          tone: result.tone,
          mood: result.mood,
          processedAt: timestamp,
        };

        batch.set(cacheRef, cacheData);
      });

      await batch.commit();
      console.log(`Batch cached ${results.length} post processing results`);
    } catch (error) {
      console.error('Error in batch caching:', error);
    }
  }

  /**
   * 오래된 캐시 데이터 정리 (선택적으로 사용)
   */
  async cleanupOldCache(olderThanDays = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

      const oldCacheQuery = admin
        .firestore()
        .collection('caches')
        .doc('postSummaries')
        .collection('summaries')
        .where('processedAt', '<', cutoffTimestamp)
        .limit(100); // 한 번에 너무 많이 삭제하지 않도록 제한

      const snapshot = await oldCacheQuery.get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = admin.firestore().batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`Cleaned up ${snapshot.size} old cache entries`);
      return snapshot.size;
    } catch (error) {
      console.error('Error cleaning up old cache:', error);
      return 0;
    }
  }

  /**
   * 캐시 통계 조회
   */
  async getCacheStats(): Promise<{
    totalCachedPosts: number;
    oldestCacheDate: Date | null;
    newestCacheDate: Date | null;
  }> {
    try {
      // 전체 캐시 개수
      const allCacheSnapshot = await admin
        .firestore()
        .collection('caches')
        .doc('postSummaries')
        .collection('summaries')
        .count()
        .get();

      const totalCachedPosts = allCacheSnapshot.data().count;

      if (totalCachedPosts === 0) {
        return {
          totalCachedPosts: 0,
          oldestCacheDate: null,
          newestCacheDate: null,
        };
      }

      // 가장 오래된 캐시
      const oldestSnapshot = await admin
        .firestore()
        .collection('caches')
        .doc('postSummaries')
        .collection('summaries')
        .orderBy('processedAt', 'asc')
        .limit(1)
        .get();

      // 가장 최신 캐시
      const newestSnapshot = await admin
        .firestore()
        .collection('caches')
        .doc('postSummaries')
        .collection('summaries')
        .orderBy('processedAt', 'desc')
        .limit(1)
        .get();

      const oldestCacheDate = oldestSnapshot.empty
        ? null
        : oldestSnapshot.docs[0].data().processedAt.toDate();

      const newestCacheDate = newestSnapshot.empty
        ? null
        : newestSnapshot.docs[0].data().processedAt.toDate();

      return {
        totalCachedPosts,
        oldestCacheDate,
        newestCacheDate,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalCachedPosts: 0,
        oldestCacheDate: null,
        newestCacheDate: null,
      };
    }
  }
}
