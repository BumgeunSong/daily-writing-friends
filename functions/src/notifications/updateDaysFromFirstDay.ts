// update post daysFromFirstDay when post is created based on board's firstDay

import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import admin from '../shared/admin';
import { isWorkingDay } from '../shared/dateUtils';
import { TimeZone } from '../shared/dateUtils';
import { Board } from '../shared/types/Board';

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
    const workingDaysFromFirstDay = calculateWorkingDaysFromFirstDay(firstDay, TimeZone.KST);

    // Update existing post with the calculated days
    if (workingDaysFromFirstDay !== null) {
      await admin.firestore().doc(`boards/${boardId}/posts/${postId}`).update({ weekDaysFromFirstDay: workingDaysFromFirstDay });
    } else {
      console.error(`Failed to calculate workingDaysFromFirstDay for postId: ${postId}`);
    }
  } catch (error) {
    console.error(`Error updating post working days from first day for postId: ${postId}`, error);
  }
});

// Function to fetch the board's first day
async function fetchBoardFirstDay(boardId: string): Promise<Timestamp | null> {
  try {
    const board = await admin.firestore().doc(`boards/${boardId}`).get();
    const boardData = board.data() as Board;
    return boardData.firstDay || null;
  } catch (error) {
    console.error(`Failed to fetch board's first day for boardId: ${boardId}`, error);
    return null;
  }
}

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

function generateDailyDatesBetween(startDate: Date, endDate: Date, timezone: TimeZone): Date[] {
    // KST로 변환
    const kstStartDate = new Date(startDate.toLocaleString('en-US', {
        timeZone: 'Asia/Seoul'
    }));
    const kstEndDate = new Date(endDate.toLocaleString('en-US', {
        timeZone: 'Asia/Seoul'
    }));

    // 시작일과 종료일을 각각 자정으로 설정 (KST)
    kstStartDate.setHours(0, 0, 0, 0);
    kstEndDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.ceil(
        (kstEndDate.getTime() - kstStartDate.getTime()) / MILLISECONDS_PER_DAY
    );
    
    return Array.from({ length: daysDiff }, (_, index) => {
        return new Date(
            kstStartDate.getTime() + index * MILLISECONDS_PER_DAY
        );
    });
}

function calculateWorkingDaysFromFirstDay(firstDay: Timestamp, timezone: TimeZone): number {
    const today = new Date();
    const firstDate = firstDay.toDate();
    
    const allDaysBetween = generateDailyDatesBetween(firstDate, today, timezone);
    // isWorkingDay 함수는 이미 KST 기준으로 동작한다고 가정
    return allDaysBetween.filter(isWorkingDay).length;
}