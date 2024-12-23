// update post daysFromFirstDay when post is created based on board's firstDay

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import admin from '../admin';
import { Board } from '../types/Board';

export const updatePostDaysFromFirstDay = onDocumentCreated('/boards/{boardId}/posts/{postId}', async (event) => {
  const postId = event.params.postId;
  const boardId = event.params.boardId;

  try {
    // Fetch the board's first day
    const firstDay = await fetchBoardFirstDay(boardId);
    if (!firstDay) {
      console.error(`No first day found for boardId: ${boardId}`);
      return;
    }

    // Calculate days from the first day
    const weekDaysFromFirstDay = calculateWeekdaysFromFirstDay(firstDay);

    // Update existing post with the calculated days
    if (weekDaysFromFirstDay !== null) {
      await admin.firestore().doc(`boards/${boardId}/posts/${postId}`).update({ weekDaysFromFirstDay });
    } else {
      console.error(`Failed to calculate weekDaysFromFirstDay for postId: ${postId}`);
    }
  } catch (error) {
    console.error(`Error updating post days from first day for postId: ${postId}`, error);
  }
});

// Function to fetch the board's first day
async function fetchBoardFirstDay(boardId: string): Promise<Date | null> {
  try {
    const board = await admin.firestore().doc(`boards/${boardId}`).get();
    const boardData = board.data() as Board;
    return boardData.firstDay?.toDate() || null;
  } catch (error) {
    console.error(`Failed to fetch board's first day for boardId: ${boardId}`, error);
    return null;
  }
}

// Function to calculate weekdays from the first day
function calculateWeekdaysFromFirstDay(firstDay: Date): number {
  const today = new Date();
  const daysArray = Array.from(
    { length: Math.ceil((today.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) },
    (_, i) => new Date(firstDay.getTime() + i * (1000 * 60 * 60 * 24))
  );

  const weekdaysCount = daysArray.filter(date => {
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sundays (0) and Saturdays (6)
  }).length;

  return weekdaysCount;
}