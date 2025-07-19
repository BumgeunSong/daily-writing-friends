import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { Posting } from "../types/Posting";
import { processPostingTransitions } from "../recoveryStatus/stateTransitions";
import { toSeoulDate } from "../dateUtils";

export const onPostingCreated = onDocumentCreated(
  'users/{userId}/postings/{postingId}',
  async (event) => {
    const postingData = event.data?.data() as Posting;
    if (!postingData) {
      console.error('No posting data found in event');
      return null;
    }

    const { userId, postingId } = event.params;
    
    if (!userId) {
      console.error('Missing userId in event parameters');
      return null;
    }

    console.log(`[PostingCreated] Processing posting created for user: ${userId}, posting: ${postingId}`);

    try {
      // Get posting creation date and convert to Seoul timezone
      const postCreatedAt = postingData.createdAt ? postingData.createdAt.toDate() : new Date();
      const seoulDate = toSeoulDate(postCreatedAt);
      
      console.log(`[PostingCreated] Post created at: ${seoulDate.toISOString()} (Seoul timezone)`);
      
      // Process state transitions based on posting creation
      await processPostingTransitions(userId, seoulDate);
      
      console.log(`[PostingCreated] Successfully processed transitions for user: ${userId}`);
      
    } catch (error) {
      console.error(`[PostingCreated] Error processing posting creation for user ${userId}:`, error);
    }

    return null;
  }
);