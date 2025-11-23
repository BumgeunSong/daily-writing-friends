import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { Posting } from "./Posting";
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
      // Phase 3: Append to event stream (event-sourced architecture)
      await appendPostCreatedEvent({
        userId,
        postId: postingData.post.id,
        boardId: postingData.board.id,
        contentLength: postingData.post.contentLength,
      });
      console.log(`[EventSourcing] Appended PostCreated event for user ${userId}`);
    } catch (error) {
      console.error(`[PostingCreated] Error appending event for user ${userId}:`, error);
    }

    return null;
  }
);