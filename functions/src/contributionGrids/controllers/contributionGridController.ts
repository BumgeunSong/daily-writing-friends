import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { ContributionGridService } from '../services/contributionGridService';
import { ContributionGridRepository } from '../repository/contributionGridRepository';
import { Posting } from '../../postings/Posting';
import { Commenting } from '../../commentings/Commenting';

/**
 * Controller for Contribution Grid Cloud Functions
 * Handles Cloud Function triggers and delegates to services
 */

// Initialize dependencies
const contributionGridRepository = new ContributionGridRepository();
const contributionGridService = new ContributionGridService(contributionGridRepository);

/**
 * Cloud Function: Update posting contribution grid when a posting is created
 */
export const updatePostingContributionGrid = onDocumentCreated(
  'users/{userId}/postings/{postingId}',
  async (event) => {
    const postingData = event.data?.data() as Posting;
    if (!postingData) {
      console.error('[ContributionGridController] No posting data found in event');
      return null;
    }

    const { userId } = event.params;
    if (!userId) {
      console.error('[ContributionGridController] Missing userId in event parameters');
      return null;
    }

    try {
      await contributionGridService.processPostingContribution(userId, postingData);
      console.log(`[ContributionGridController] Successfully processed posting contribution for user: ${userId}`);
    } catch (error) {
      console.error(`[ContributionGridController] Error processing posting contribution for user ${userId}:`, error);
    }

    return null;
  },
);

/**
 * Cloud Function: Update commenting contribution grid when a commenting is created
 */
export const updateCommentingContributionGrid = onDocumentCreated(
  'users/{userId}/commentings/{commentingId}',
  async (event) => {
    const commentingData = event.data?.data() as Commenting;
    if (!commentingData) {
      console.error('[ContributionGridController] No commenting data found in event');
      return null;
    }

    const { userId } = event.params;
    if (!userId) {
      console.error('[ContributionGridController] Missing userId in event parameters');
      return null;
    }

    try {
      await contributionGridService.processCommentingContribution(userId, commentingData);
      console.log(`[ContributionGridController] Successfully processed commenting contribution for user: ${userId}`);
    } catch (error) {
      console.error(`[ContributionGridController] Error processing commenting contribution for user ${userId}:`, error);
    }

    return null;
  },
);