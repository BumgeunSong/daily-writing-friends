// update post daysFromFirstDay when post is created based on board's firstDay

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { Post } from '../types/Post';
import admin from '../admin';
import { Board } from '../types/Board';

// Function to fetch the board's first day
async function fetchBoardFirstDay(boardId: string): Promise<Date | null> {
    const board = await admin.firestore().doc(`boards/${boardId}`).get();
    const boardData = board.data() as Board;
    return boardData.firstDay?.toDate() || null;
}

// Function to calculate weekdays from the first day
function calculateWeekdaysFromFirstDay(firstDay: Date | null): number | null {
  if (!firstDay) return null;

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

export const updatePostDaysFromFirstDay = onDocumentCreated('posts', async (event) => {
  const post = event.data?.data() as Post;
  const boardId = post.boardId;

  // Fetch the board's first day
  const firstDay = await fetchBoardFirstDay(boardId);

  // Calculate days from the first day
  const weekDaysFromFirstDay = calculateWeekdaysFromFirstDay(firstDay);

  // Update existing post with the calculated days
  if (weekDaysFromFirstDay) {
    await admin.firestore().doc(`boards/${boardId}/posts/${post.id}`).update({ weekDaysFromFirstDay });
  }
});
