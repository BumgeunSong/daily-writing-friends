import type { Contribution } from '@/stats/model/WritingStats';
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import { createEmptyMatrices, updateMatricesAtPosition } from './gridMatrix';
import {
  calculateGridPosition,
  normalizeToMidnight,
  filterWeekdayContributions,
} from './gridPosition';
import { initializeGridWithPlaceholders } from './placeholders';
import { getTimeRange, filterContributionsInTimeRange } from './timeRange';
import type {
  ContributionMatrix,
  ContributionDataMatrix,
  ContributionData,
  GridResult,
} from './types';

export function placeContributionInGrid(
  contribution: ContributionData,
  getValue: (contribution: ContributionData) => number | null,
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
): void {
  const date = new Date(contribution.createdAt);
  normalizeToMidnight(date);

  const position = calculateGridPosition(date, weeksAgo);

  if (position) {
    const value = getValue(contribution);
    updateMatricesAtPosition(matrices, position, contribution, value);
  }
}

function placeAllContributionsInGrid<T extends ContributionData>(
  contributions: T[],
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
  getValue: (contribution: T) => number | null,
): void {
  contributions.forEach((contribution) => {
    placeContributionInGrid(contribution, (c) => getValue(c as T), matrices, weeksAgo);
  });
}

function calculateMaxValueFromWeekdayContributions<T extends ContributionData>(
  contributions: T[],
  getValue: (contribution: T) => number | null,
): number {
  const weekdayContributions = filterWeekdayContributions(contributions);
  // null marks a day with no activity — exclude it so it never inflates the scale
  const values = weekdayContributions.map(getValue).filter((v): v is number => v !== null);
  return Math.max(...values, 0);
}

export function processContributionsInGrid<T extends ContributionData>(
  contributions: T[],
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
  today: Date,
  getValue: (contribution: T) => number | null,
): { processedContributions: T[]; maxValue: number } {
  const recentContributions = filterContributionsInTimeRange(contributions, weeksAgo, today);
  placeAllContributionsInGrid(recentContributions, matrices, weeksAgo, getValue);
  const maxValue = calculateMaxValueFromWeekdayContributions(recentContributions, getValue);
  return { processedContributions: recentContributions, maxValue };
}

function extractContentLengthValue(contribution: Contribution): number | null {
  // Preserve null (= no post that day). A real post with 0-length content (e.g. an
  // image-only post) keeps its 0 so it stays distinguishable from a no-post day.
  return contribution.contentLength;
}

/**
 * 글쓰기 기여도를 그리드 데이터로 처리합니다.
 * @param contributions 기여도 데이터 배열
 * @param timeRange 시간 범위 (테스트용, 기본값: getTimeRange())
 * @returns 그리드 결과 (matrix, weeklyContributions, maxValue)
 */
export function processPostingContributions(
  contributions: Contribution[],
  timeRange?: { weeksAgo: Date; today: Date },
): GridResult {
  const matrices = createEmptyMatrices();
  const { weeksAgo, today } = timeRange ?? getTimeRange();

  initializeGridWithPlaceholders(matrices, weeksAgo, today, 'posting');
  const { maxValue } = processContributionsInGrid(
    contributions,
    matrices,
    weeksAgo,
    today,
    extractContentLengthValue,
  );

  return {
    matrix: matrices.matrix,
    weeklyContributions: matrices.weeklyContributions,
    maxValue,
  };
}

function extractCommentAndRepliesCount(contribution: CommentingContribution): number | null {
  // Preserve null (= no comment/reply that day) so it stays gray. An active day is
  // always >= 1, so commenting never produces a legitimate 0.
  return contribution.countOfCommentAndReplies;
}

/**
 * 댓글/답글 기여도를 그리드 데이터로 처리합니다.
 * @param contributions 기여도 데이터 배열
 * @param timeRange 시간 범위 (테스트용, 기본값: getTimeRange())
 * @returns 그리드 결과 (matrix, weeklyContributions, maxValue)
 */
export function processCommentingContributions(
  contributions: CommentingContribution[],
  timeRange?: { weeksAgo: Date; today: Date },
): GridResult {
  const matrices = createEmptyMatrices();
  const { weeksAgo, today } = timeRange ?? getTimeRange();

  initializeGridWithPlaceholders(matrices, weeksAgo, today, 'commenting');
  const { maxValue } = processContributionsInGrid(
    contributions,
    matrices,
    weeksAgo,
    today,
    extractCommentAndRepliesCount,
  );

  return {
    matrix: matrices.matrix,
    weeklyContributions: matrices.weeklyContributions,
    maxValue,
  };
}
