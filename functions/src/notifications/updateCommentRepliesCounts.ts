import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/https';

const BATCH_SIZE = 100;
const FUNCTION_TIMEOUT = 540000; // 9분

interface BatchStats {
  processedBoards: number;
  processedPosts: number;
  errors: string[];
  startTime: number;
}

// 배치 처리 상태 관리
const createStats = (): BatchStats => ({
  processedBoards: 0,
  processedPosts: 0,
  errors: [],
  startTime: Date.now()
});

export const updateCommentRepliesCounts = onRequest(async (req, res) => {
  const stats = createStats();
  const db = admin.firestore();

  try {
    const boardsSnapshot = await db.collection('boards').get();

    for (const boardDoc of boardsSnapshot.docs) {
      await processBoard(boardDoc, stats);
      stats.processedBoards++;

      // 타임아웃 체크
      if (Date.now() - stats.startTime > FUNCTION_TIMEOUT) {
        throw new Error('Function timeout approaching');
      }
    }

    res.json({
      success: true,
      stats: {
        ...stats,
        executionTime: `${(Date.now() - stats.startTime) / 1000} seconds`
      }
    });

  } catch (error) {
    console.error('Error in updateCommentRepliesCounts:', error);
    res.status(500).json({
      success: false,
      error: error,
      stats: {
        ...stats,
        executionTime: `${(Date.now() - stats.startTime) / 1000} seconds`
      }
    });
  }
});

async function processBoard(
  boardDoc: FirebaseFirestore.QueryDocumentSnapshot,
  stats: BatchStats
) {
  const db = admin.firestore();
  let lastDoc = null;

  do {
    let query = boardDoc.ref.collection('posts')
      .orderBy('createdAt')
      .limit(BATCH_SIZE);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const postsSnapshot = await query.get();
    if (postsSnapshot.empty) break;

    // 트랜잭션으로 배치 처리
    await db.runTransaction(async (transaction) => {
      // 1. 먼저 모든 읽기 작업을 수행
      const updatePromises = await Promise.all(
        postsSnapshot.docs.map(async (postDoc) => {
          try {
            const counts = await getCommentAndReplyCounts(postDoc.ref, transaction);
            return {
              ref: postDoc.ref,
              counts,
              success: true
            };
          } catch (error) {
            stats.errors.push(`Error processing post ${postDoc.id}: ${error}`);
            console.error(`Error processing post ${postDoc.id}:`, error);
            return {
              ref: postDoc.ref,
              success: false
            };
          }
        })
      );

      // 2. 그 다음 모든 쓰기 작업을 수행
      updatePromises.forEach(update => {
        if (update.success) {
          transaction.update(update.ref, {
            countOfComments: update.counts!.commentCount,
            countOfReplies: update.counts!.replyCount
          });
          stats.processedPosts++;
        }
      });
    });

    lastDoc = postsSnapshot.docs[postsSnapshot.docs.length - 1];
    console.log(`Processed ${stats.processedPosts} posts in board ${boardDoc.id}`);

  } while (lastDoc);
}

async function getCommentAndReplyCounts(
  postRef: FirebaseFirestore.DocumentReference,
  transaction: FirebaseFirestore.Transaction
): Promise<{ commentCount: number; replyCount: number }> {
  // 모든 읽기 작업을 한번에 수행
  const commentsSnapshot = await transaction.get(postRef.collection('comments'));
  
  // 댓글에 대한 답글 수 읽기를 병렬로 처리
  const replyCounts = await Promise.all(
    commentsSnapshot.docs.map(async (commentDoc) => {
      const replySnapshot = await transaction.get(commentDoc.ref.collection('reply'));
      return replySnapshot.size;
    })
  );

  return {
    commentCount: commentsSnapshot.size,
    replyCount: replyCounts.reduce((sum, count) => sum + count, 0)
  };
}