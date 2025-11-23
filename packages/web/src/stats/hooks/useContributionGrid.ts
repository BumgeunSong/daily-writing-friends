import { useMemo } from 'react';
import { Contribution } from '@/stats/model/WritingStats';
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import {
  processPostingContributions,
  processCommentingContributions,
  createEmptyGridResult,
  type GridResult,
} from '@/stats/utils/contributionGridUtils';
import { useHolidays } from '@/shared/hooks/useHolidays';

export type ContributionType = 'posting' | 'commenting';

function extractContributionValue(
  contribution: Contribution | CommentingContribution,
  type: ContributionType,
): number | null {
  return type === 'posting'
    ? (contribution as Contribution).contentLength
    : (contribution as CommentingContribution).countOfCommentAndReplies;
}

function createContributionKey(
  contribution: Contribution | CommentingContribution,
  type: ContributionType,
): string {
  const value = extractContributionValue(contribution, type);
  return `${contribution.createdAt}-${value}`;
}

function createContributionsHash(
  contributions: (Contribution | CommentingContribution)[],
  type: ContributionType,
): string {
  return contributions.map((c) => createContributionKey(c, type)).join('|');
}

/**
 * Creates a stable hash from contributions array to prevent unnecessary recalculations
 * when the array reference changes but content remains the same
 */
export function useContributionsHash(
  contributions: (Contribution | CommentingContribution)[],
  type: ContributionType,
) {
  return useMemo(() => createContributionsHash(contributions, type), [contributions, type]);
}

function processGridData(
  contributions: (Contribution | CommentingContribution)[],
  type: ContributionType,
  holidayMap: Map<string, string>,
): GridResult {
  if (!contributions.length) {
    return createEmptyGridResult();
  }

  return type === 'posting'
    ? processPostingContributions(contributions as Contribution[], holidayMap)
    : processCommentingContributions(contributions as CommentingContribution[], holidayMap);
}

/**
 * Processes contributions and returns grid data with memoization
 */
export function useContributionGridData(
  contributions: (Contribution | CommentingContribution)[],
  type: ContributionType,
): GridResult {
  const contributionsHash = useContributionsHash(contributions, type);
  const { holidayMap } = useHolidays();

  return useMemo(
    () => processGridData(contributions, type, holidayMap),
    [type, contributionsHash, holidayMap],
  );
}
