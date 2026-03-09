import type { Contribution } from '@/stats/model/WritingStats';
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import { calculateGridPositionDate } from './gridPosition';
import { formatDateInKoreanTimezone, isDateWithinTodayInclusive } from './timeRange';
import type {
  ContributionMatrix,
  ContributionDataMatrix,
  ContributionData} from './types';
import {
  WEEKS_TO_DISPLAY,
  WEEKDAYS_COUNT
} from './types';

function createPostingPlaceholderWithZeroContent(dateStr: string): Contribution {
  return { createdAt: dateStr, contentLength: 0 };
}

function createCommentingPlaceholderWithZeroCount(dateStr: string): CommentingContribution {
  return { createdAt: dateStr, countOfCommentAndReplies: 0 };
}

function createPlaceholderByType(
  contributionType: 'posting' | 'commenting',
  dateStr: string,
): ContributionData {
  return contributionType === 'posting'
    ? createPostingPlaceholderWithZeroContent(dateStr)
    : createCommentingPlaceholderWithZeroCount(dateStr);
}

function initializeSinglePlaceholder(
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  date: Date,
  weekRow: number,
  weekdayColumn: number,
  contributionType: 'posting' | 'commenting',
): void {
  const dateStr = formatDateInKoreanTimezone(date);
  const placeholder = createPlaceholderByType(contributionType, dateStr);
  matrices.weeklyContributions[weekRow][weekdayColumn] = placeholder;
}

export function initializeGridWithPlaceholders(
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
  today: Date,
  contributionType: 'posting' | 'commenting',
): void {
  for (let weekRow = 0; weekRow < WEEKS_TO_DISPLAY; weekRow++) {
    for (let weekdayColumn = 0; weekdayColumn < WEEKDAYS_COUNT; weekdayColumn++) {
      const date = calculateGridPositionDate(weeksAgo, weekRow, weekdayColumn);

      if (isDateWithinTodayInclusive(date, today)) {
        initializeSinglePlaceholder(matrices, date, weekRow, weekdayColumn, contributionType);
      }
    }
  }
}
