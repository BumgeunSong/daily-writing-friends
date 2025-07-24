import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { Posting } from "./Posting";
import { calculatePostingTransitions } from "../recoveryStatus/stateTransitions";
import { updateStreakInfo } from "../recoveryStatus/streakUtils";
import { toSeoulDate } from "../shared/dateUtils";

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
      let postCreatedAt: Date;
      
      if (postingData.createdAt) {
        postCreatedAt = postingData.createdAt.toDate();
      } else {
        console.warn(`[PostingCreated] Warning: createdAt is missing for posting ${postingId}, using current Seoul time as fallback`);
        // Use Seoul time for consistency instead of server local time
        postCreatedAt = toSeoulDate(new Date());
      }
      
      const seoulDate = toSeoulDate(postCreatedAt);
      
      console.log(`[PostingCreated] Post created at: ${seoulDate.toISOString()} (Seoul timezone)`);
      
      // Process state transitions based on posting creation
      const dbUpdate = await calculatePostingTransitions(userId, seoulDate);
      if (dbUpdate) {
        await updateStreakInfo(userId, dbUpdate.updates);
        console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`, JSON.stringify(dbUpdate, null, 2));
      }
      
      console.log(`[PostingCreated] Successfully processed transitions for user: ${userId}`);
      
    } catch (error) {
      console.error(`[PostingCreated] Error processing posting creation for user ${userId}:`, error);
    }

    return null;
  }
);