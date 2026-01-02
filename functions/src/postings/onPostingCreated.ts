import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { Posting } from "./Posting";

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

    return null;
  }
);