import { useMemo } from 'react'
import { Contribution } from '@/stats/model/WritingStats'
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils'
import {
  processPostingContributions,
  processCommentingContributions,
  createEmptyGridResult,
  type GridResult,
} from '@/stats/utils/contributionGridUtils'

export type ContributionType = 'posting' | 'commenting'

/**
 * Creates a stable hash from contributions array to prevent unnecessary recalculations
 * when the array reference changes but content remains the same
 */
export function useContributionsHash(
  contributions: (Contribution | CommentingContribution)[],
  type: ContributionType
) {
  return useMemo(() => {
    return contributions.map(c => {
      const value = type === 'posting' 
        ? (c as Contribution).contentLength 
        : (c as CommentingContribution).countOfCommentAndReplies
      return `${c.createdAt}-${value}`
    }).join('|')
  }, [contributions, type])
}

/**
 * Processes contributions and returns grid data with memoization
 */
export function useContributionGridData(
  contributions: (Contribution | CommentingContribution)[],
  type: ContributionType
): GridResult {
  const contributionsHash = useContributionsHash(contributions, type)

  return useMemo(() => {
    // Early return for empty contributions
    if (!contributions.length) {
      return createEmptyGridResult()
    }

    // Process contributions based on type
    return type === 'posting'
      ? processPostingContributions(contributions as Contribution[])
      : processCommentingContributions(contributions as CommentingContribution[])
  }, [type, contributionsHash])
}