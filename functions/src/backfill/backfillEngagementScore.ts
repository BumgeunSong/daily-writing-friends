/**
 * Cloud Function to backfill engagementScore for all existing posts
 * Run once after deploying updateEngagementScore function
 */
import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import admin from '../shared/admin';
import { calculateEngagementScore } from '../engagementScore/calculateEngagementScore';

setGlobalOptions({
  region: 'us-central1',
  maxInstances: 1,
});

interface BackfillRequest {
  boardId: string;
  dryRun?: boolean;
  batchSize?: number;
}

interface BackfillResult {
  boardId: string;
  totalPosts: number;
  updatedPosts: number;
  skippedPosts: number;
  errors: string[];
  dryRun: boolean;
}

export const backfillEngagementScoreHttp = onRequest(
  { timeoutSeconds: 540 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { boardId, dryRun = true, batchSize = 500 } = req.body as BackfillRequest;

    if (!boardId) {
      res.status(400).json({ error: 'boardId is required' });
      return;
    }

    try {
      const result = await backfillEngagementScoreForBoard(boardId, dryRun, batchSize);
      res.status(200).json(result);
    } catch (error) {
      console.error('Backfill failed:', error);
      res.status(500).json({ error: String(error) });
    }
  }
);

async function backfillEngagementScoreForBoard(
  boardId: string,
  dryRun: boolean,
  batchSize: number
): Promise<BackfillResult> {
  const postsRef = admin.firestore().collection(`boards/${boardId}/posts`);
  const snapshot = await postsRef.get();

  const result: BackfillResult = {
    boardId,
    totalPosts: snapshot.size,
    updatedPosts: 0,
    skippedPosts: 0,
    errors: [],
    dryRun,
  };

  const batch = admin.firestore().batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { countOfComments, countOfReplies, countOfLikes, engagementScore } = data;

    const newScore = calculateEngagementScore(countOfComments, countOfReplies, countOfLikes);

    if (engagementScore === newScore) {
      result.skippedPosts++;
      continue;
    }

    if (!dryRun) {
      batch.update(doc.ref, { engagementScore: newScore });
      batchCount++;

      if (batchCount >= batchSize) {
        await batch.commit();
        batchCount = 0;
      }
    }

    result.updatedPosts++;
    console.info(`Post ${doc.id}: score ${engagementScore ?? 'undefined'} -> ${newScore}`);
  }

  if (!dryRun && batchCount > 0) {
    await batch.commit();
  }

  console.info(`Backfill complete for board ${boardId}:`, result);
  return result;
}
