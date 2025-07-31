import admin from '../../shared/admin';
import { Posting } from '../../postings/Posting';
import { Commenting } from '../../commentings/Commenting';

/**
 * Repository for User Activity Data Access
 * Handles all Firestore operations for user postings and commentings
 */
export class UserActivityRepository {
  private db = admin.firestore();

  /**
   * Get all user IDs from the users collection
   */
  async getAllUserIds(): Promise<string[]> {
    try {
      const usersSnapshot = await this.db.collection('users').get();
      return usersSnapshot.docs.map((doc) => doc.id);
    } catch (error) {
      console.error('[UserActivityRepository] Error getting all user IDs:', error);
      throw error;
    }
  }

  /**
   * Get user's historical postings
   */
  async getUserPostings(userId: string): Promise<Posting[]> {
    try {
      const postingsSnapshot = await this.db
        .collection('users')
        .doc(userId)
        .collection('postings')
        .get();

      return postingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as unknown as Posting[];
    } catch (error) {
      console.error(`[UserActivityRepository] Error getting postings for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's historical commentings
   */
  async getUserCommentings(userId: string): Promise<Commenting[]> {
    try {
      const commentingsSnapshot = await this.db
        .collection('users')
        .doc(userId)
        .collection('commentings')
        .get();

      return commentingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as unknown as Commenting[];
    } catch (error) {
      console.error(`[UserActivityRepository] Error getting commentings for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's activities (both postings and commentings)
   */
  async getUserActivities(userId: string): Promise<{
    postings: Posting[];
    commentings: Commenting[];
  }> {
    try {
      const [postings, commentings] = await Promise.all([
        this.getUserPostings(userId),
        this.getUserCommentings(userId),
      ]);

      return { postings, commentings };
    } catch (error) {
      console.error(`[UserActivityRepository] Error getting activities for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get activities for multiple users in batch
   */
  async getBatchUserActivities(userIds: string[]): Promise<Array<{
    userId: string;
    postings: Posting[];
    commentings: Commenting[];
  }>> {
    try {
      const results = await Promise.allSettled(
        userIds.map(async (userId) => {
          const activities = await this.getUserActivities(userId);
          return {
            userId,
            ...activities,
          };
        }),
      );

      const successfulResults: Array<{
        userId: string;
        postings: Posting[];
        commentings: Commenting[];
      }> = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
        } else {
          console.error(
            `[UserActivityRepository] Failed to get activities for user ${userIds[i]}:`,
            result.reason,
          );
        }
      }

      return successfulResults;
    } catch (error) {
      console.error('[UserActivityRepository] Error in batch get user activities:', error);
      throw error;
    }
  }
}