import { isConfigurableHoliday } from '@/shared/utils/dateUtils';
import { Contribution } from '@/stats/model/WritingStats';
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import { calculateGridPositionDate } from './gridPosition';
import { formatDateInKoreanTimezone, isDateWithinTodayInclusive } from './timeRange';
import {
  WEEKS_TO_DISPLAY,
  WEEKDAYS_COUNT,
  ContributionMatrix,
  ContributionDataMatrix,
  ContributionData,
} from './types';

function createPostingPlaceholderWithZeroContent(
  dateStr: string,
  isHoliday = false,
  holidayName?: string,
): Contribution {
  return {
    createdAt: dateStr,
    contentLength: 0,
    isHoliday,
    holidayName,
  };
}

function createCommentingPlaceholderWithZeroCount(
  dateStr: string,
  isHoliday = false,
  holidayName?: string,
): CommentingContribution {
  return {
    createdAt: dateStr,
    countOfCommentAndReplies: 0,
    isHoliday,
    holidayName,
  };
}

function createPlaceholderByType(
  contributionType: 'posting' | 'commenting',
  dateStr: string,
  isHoliday = false,
  holidayName?: string,
): ContributionData {
  return contributionType === 'posting'
    ? createPostingPlaceholderWithZeroContent(dateStr, isHoliday, holidayName)
    : createCommentingPlaceholderWithZeroCount(dateStr, isHoliday, holidayName);
}

function shouldInitializePlaceholder(date: Date, today: Date): boolean {
  return isDateWithinTodayInclusive(date, today);
}

function initializeSinglePlaceholder(
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  date: Date,
  weekRow: number,
  weekdayColumn: number,
  contributionType: 'posting' | 'commenting',
  configurableHolidays?: Map<string, string>,
): void {
  const dateStr = formatDateInKoreanTimezone(date);
  const isHoliday = isConfigurableHoliday(date, configurableHolidays);
  const holidayName = isHoliday ? configurableHolidays?.get(dateStr) : undefined;
  const placeholder = createPlaceholderByType(contributionType, dateStr, isHoliday, holidayName);

  matrices.weeklyContributions[weekRow][weekdayColumn] = placeholder;
}

export function initializeGridWithPlaceholders(
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
  today: Date,
  contributionType: 'posting' | 'commenting',
  configurableHolidays?: Map<string, string>,
): void {
  for (let weekRow = 0; weekRow < WEEKS_TO_DISPLAY; weekRow++) {
    for (let weekdayColumn = 0; weekdayColumn < WEEKDAYS_COUNT; weekdayColumn++) {
      const date = calculateGridPositionDate(weeksAgo, weekRow, weekdayColumn);

      if (shouldInitializePlaceholder(date, today)) {
        initializeSinglePlaceholder(
          matrices,
          date,
          weekRow,
          weekdayColumn,
          contributionType,
          configurableHolidays,
        );
      }
    }
  }
}
