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

// Function to calculate days from the first day
function calculateDaysFromFirstDay(firstDay: Date | null): number | null {
  if (!firstDay) return null;
  const diffTime = Math.abs(new Date().getTime() - firstDay.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export const updatePostDaysFromFirstDay = onDocumentCreated('posts', async (event) => {
  const post = event.data?.data() as Post;
  const boardId = post.boardId;

  // Fetch the board's first day
  const firstDay = await fetchBoardFirstDay(boardId);

  // Calculate days from the first day
  const daysFromFirstDay = calculateDaysFromFirstDay(firstDay);

  // Update existing post with the calculated days
  if (daysFromFirstDay) {
    await admin.firestore().doc(`boards/${boardId}/posts/${post.id}`).update({ daysFromFirstDay });
  }
});
