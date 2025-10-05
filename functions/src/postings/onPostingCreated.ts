import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { Posting } from "./Posting";
import { calculatePostingTransitions } from "../recoveryStatus/stateTransitions";
import { updateStreakInfo } from "../recoveryStatus/streakUtils";
import { convertToSeoulTime } from "../shared/seoulTime";
import { addRecoveryHistoryToSubcollection } from "../recoveryStatus/recoveryUtils";
import { appendPostCreatedEvent } from "../eventSourcing/append/appendEvent";

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
        postCreatedAt = convertToSeoulTime(new Date());
      }
      
      const seoulDate = convertToSeoulTime(postCreatedAt);
      
      console.log(`[PostingCreated] Post created at: ${seoulDate.toISOString()} (Seoul timezone)`);
      
      // Process state transitions based on posting creation
      const dbUpdate = await calculatePostingTransitions(userId, seoulDate);
      if (dbUpdate) {
        // Update streak info first
        await updateStreakInfo(userId, dbUpdate.updates);
        console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`, JSON.stringify(dbUpdate, null, 2));
        
        // If recovery was completed, add recovery history to subcollection
        if (dbUpdate.recoveryHistory) {
          await addRecoveryHistoryToSubcollection(userId, dbUpdate.recoveryHistory);
          console.log(`[RecoveryHistory] Recovery completed for user ${userId}`);
        }
      }
      
      console.log(`[PostingCreated] Successfully processed transitions for user: ${userId}`);

      // Phase 1: Dual-write to event stream (new event-sourced architecture)
      await appendPostCreatedEvent({
        userId,
        postId: postingData.post.id,
        boardId: postingData.board.id,
        contentLength: postingData.post.contentLength,
      });
      console.log(`[EventSourcing] Appended PostCreated event for user ${userId}`);

    } catch (error) {
      console.error(`[PostingCreated] Error processing posting creation for user ${userId}:`, error);
    }

    return null;
  }
);