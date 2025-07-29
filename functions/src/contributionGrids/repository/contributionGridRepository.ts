import admin from '../../shared/admin';
import { ContributionGrid, ActivityType } from '../domain/models';

/**
 * Repository for Contribution Grid Data Access
 * Handles all Firestore operations for contribution grids
 */
export class ContributionGridRepository {
  private db = admin.firestore();
  private collectionName = 'contributionGrids';

  /**
   * Get existing contribution grid for a user and activity type
   */
  async getGrid(userId: string, activityType: ActivityType): Promise<ContributionGrid | null> {
    try {
      const docId = `${userId}_${activityType}`;
      const docRef = this.db.collection(this.collectionName).doc(docId);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        return null;
      }
      
      return docSnap.data() as ContributionGrid;
    } catch (error) {
      console.error(`[ContributionGridRepository] Error getting grid for user ${userId}, type ${activityType}:`, error);
      throw error;
    }
  }

  /**
   * Save contribution grid to Firestore
   */
  async saveGrid(userId: string, activityType: ActivityType, grid: ContributionGrid): Promise<void> {
    try {
      const docId = `${userId}_${activityType}`;
      const docRef = this.db.collection(this.collectionName).doc(docId);
      
      await docRef.set(grid);
      
      console.log(`[ContributionGridRepository] Successfully saved grid for user ${userId}, type ${activityType}`);
    } catch (error) {
      console.error(`[ContributionGridRepository] Error saving grid for user ${userId}, type ${activityType}:`, error);
      throw error;
    }
  }

  /**
   * Check if grids exist for a user
   */
  async checkExistingGrids(userId: string): Promise<{
    hasPostingGrid: boolean;
    hasCommentingGrid: boolean;
  }> {
    try {
      const postingGridRef = this.db
        .collection(this.collectionName)
        .doc(`${userId}_${ActivityType.POSTING}`);
      const commentingGridRef = this.db
        .collection(this.collectionName)
        .doc(`${userId}_${ActivityType.COMMENTING}`);

      const [postingDoc, commentingDoc] = await Promise.all([
        postingGridRef.get(),
        commentingGridRef.get(),
      ]);

      return {
        hasPostingGrid: postingDoc.exists,
        hasCommentingGrid: commentingDoc.exists,
      };
    } catch (error) {
      console.error(`[ContributionGridRepository] Error checking existing grids for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Batch save multiple grids
   */
  async batchSaveGrids(updates: Array<{
    userId: string;
    activityType: ActivityType;
    grid: ContributionGrid;
  }>): Promise<void> {
    if (updates.length === 0) {
      console.log('[ContributionGridRepository] No updates to save');
      return;
    }

    try {
      const batchSize = 500; // Firestore batch limit

      // Split updates into batches
      for (let i = 0; i < updates.length; i += batchSize) {
        const batchUpdates = updates.slice(i, i + batchSize);
        const batch = this.db.batch();

        for (const update of batchUpdates) {
          const docId = `${update.userId}_${update.activityType}`;
          const docRef = this.db.collection(this.collectionName).doc(docId);
          batch.set(docRef, update.grid);
        }

        await batch.commit();
        console.log(
          `[ContributionGridRepository] Applied batch ${Math.floor(i / batchSize) + 1}: ${batchUpdates.length} updates`,
        );
      }
    } catch (error) {
      console.error('[ContributionGridRepository] Error in batch save:', error);
      throw error;
    }
  }
}