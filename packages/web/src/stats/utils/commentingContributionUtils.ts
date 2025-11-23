import { getDateKey } from '@/shared/utils/dateUtils';
import { Commenting } from '@/user/model/Commenting';
import { Replying } from '@/user/model/Replying';

export type CommentingContribution = {
  createdAt: string; // YYYY-MM-DD
  countOfCommentAndReplies: number | null;
  isHoliday?: boolean;
  holidayName?: string;
};

export function aggregateCommentingContributions(
  commentings: Commenting[],
  replyings: Replying[],
  workingDays: Date[],
): CommentingContribution[] {
  const countMap = new Map<string, number>();

  for (const c of commentings) {
    const key = getDateKey(c.createdAt.toDate());
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }
  for (const r of replyings) {
    const key = getDateKey(r.createdAt.toDate());
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  return workingDays.map((day) => {
    const key = getDateKey(day);
    return {
      createdAt: key,
      countOfCommentAndReplies: countMap.get(key) ?? null,
    };
  });
}
