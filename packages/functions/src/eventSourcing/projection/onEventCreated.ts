import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { projectStreakForUser } from './projectStreakForUser';

/**
 * Trigger projector when a new event is created.
 * Runs immediately after event append to keep projection up-to-date.
 */
export const onEventCreatedTrigger = onDocumentCreated(
  'users/{userId}/events/{eventId}',
  async (event) => {
    const { userId } = event.params;

    try {
      await projectStreakForUser(userId);
      console.log(`Successfully projected events for user ${userId}`);
    } catch (error) {
      console.error(`Error projecting events for user ${userId}:`, error);
    }
  },
);
