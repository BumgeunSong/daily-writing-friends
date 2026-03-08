import type { Contribution } from '@/stats/model/WritingStats';
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils';

export const WEEKS_TO_DISPLAY = 4;
export const WEEKDAYS_COUNT = 5;
export const DAYS_PER_WEEK = 7;
export const SUNDAY = 0;
export const SATURDAY = 6;
export const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

export type ContributionData = Contribution | CommentingContribution;
export type ContributionMatrix = (number | null)[][];
export type ContributionDataMatrix = (ContributionData | null)[][];

export interface GridPosition {
  weekRow: number;
  weekdayColumn: number;
}

export interface GridResult {
  matrix: ContributionMatrix;
  weeklyContributions: ContributionDataMatrix;
  maxValue: number;
}

export type DateLike = string | Date;

export interface HasCreatedAt {
  createdAt: DateLike;
}
