import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import admin from '../shared/admin';
import { calculateEngagementScore, shouldUpdateEngagementScore } from './calculateEngagementScore';

interface PostData {
  countOfComments?: number;
  countOfReplies?: number;
  countOfLikes?: number;
  engagementScore?: number;
}

export const updateEngagementScore = onDocumentWritten(
  'boards/{boardId}/posts/{postId}',
  async (event) => {
    const afterData = event.data?.after.data() as PostData | undefined;

    if (!afterData) {
      return;
    }

    const { countOfComments, countOfReplies, countOfLikes, engagementScore: previousScore } = afterData;

    const newScore = calculateEngagementScore(countOfComments, countOfReplies, countOfLikes);

    if (!shouldUpdateEngagementScore(previousScore, newScore)) {
      return;
    }

    const { boardId, postId } = event.params;
    const postRef = admin.firestore().doc(`boards/${boardId}/posts/${postId}`);

    try {
      await postRef.update({ engagementScore: newScore });
      console.info(`Updated engagementScore for post ${boardId}/${postId}: ${newScore}`);
    } catch (error) {
      console.error(`Error updating engagementScore for post ${boardId}/${postId}:`, error);
    }
  }
);
