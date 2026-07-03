/**
 * Compute the number of working days (Mon-Fri) from a board's first day to a post's creation date.
 *
 * Mirrors the Cloud Function `updatePostDaysFromFirstDay` with two differences:
 * - Uses postCreatedAt (fixed) instead of new Date() (current time).
 * - Computes KST weekday via modular arithmetic to avoid DST issues in non-KST browsers.
 *
 * Both dates are projected to KST (Asia/Seoul) calendar dates before counting.
 */
import { projectToTimezone } from '@/shared/utils/dateUtils';

export function computeWeekDaysFromFirstDay(boardFirstDay: string, postCreatedAt: string): number {
  const kstStart = projectToTimezone(new Date(boardFirstDay), 'Asia/Seoul');
  const kstEnd = projectToTimezone(new Date(postCreatedAt), 'Asia/Seoul');
  kstStart.setHours(0, 0, 0, 0);
  kstEnd.setHours(0, 0, 0, 0);

  const msPerDay = 86400000;
  const daysDiff = Math.ceil((kstEnd.getTime() - kstStart.getTime()) / msPerDay);

  // Use modular arithmetic from the known KST start day to avoid creating
  // intermediate Date objects that could be affected by local DST transitions.
  const startDay = kstStart.getDay();
  let workingDays = 0;
  for (let i = 0; i < daysDiff; i++) {
    const day = (startDay + i) % 7;
    if (day !== 0 && day !== 6) workingDays++;
  }

  return workingDays;
}
