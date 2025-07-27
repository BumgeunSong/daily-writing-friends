import { useMemo } from "react"
import { cn } from "@/shared/utils/cn"
import { ContributionItem } from "@/stats/components/ContributionItem"
import { Contribution } from "@/stats/model/WritingStats"
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils'
import {
  createEmptyMatrices,
  getTimeRange,
  filterContributionsInTimeRange,
  placeContributionInGrid,
  WEEKS_TO_DISPLAY,
  type GridResult
} from '@/stats/utils/contributionGridUtils'

// Type-specific contribution handlers
function processPostingContributions(contributions: Contribution[]): GridResult {
  const matrices = createEmptyMatrices()
  const { weeksAgo, today } = getTimeRange()
  
  const recentContributions = filterContributionsInTimeRange(contributions, weeksAgo, today)
  
  recentContributions.forEach(contribution => {
    placeContributionInGrid(
      contribution,
      (c) => (c as Contribution).contentLength ?? 0,
      matrices,
      weeksAgo
    )
  })
  
  const maxValue = Math.max(...contributions.map(c => c.contentLength ?? 0), 0)
  
  return {
    matrix: matrices.matrix,
    weeklyContributions: matrices.weeklyContributions,
    maxValue
  }
}

function processCommentingContributions(contributions: CommentingContribution[]): GridResult {
  const matrices = createEmptyMatrices()
  const { weeksAgo, today } = getTimeRange()
  
  const recentContributions = filterContributionsInTimeRange(contributions, weeksAgo, today)
  
  recentContributions.forEach(contribution => {
    placeContributionInGrid(
      contribution,
      (c) => (c as CommentingContribution).countOfCommentAndReplies ?? 0,
      matrices,
      weeksAgo
    )
  })
  
  const maxValue = Math.max(...contributions.map(c => c.countOfCommentAndReplies ?? 0), 0)
  
  return {
    matrix: matrices.matrix,
    weeklyContributions: matrices.weeklyContributions,
    maxValue
  }
}

// Main component props
export type ContributionGraphProps =
  | { type: 'posting'; contributions: Contribution[]; className?: string }
  | { type: 'commenting'; contributions: CommentingContribution[]; className?: string }

export function ContributionGraph(props: ContributionGraphProps) {
  const { matrix, maxValue, weeklyContributions } = useMemo(() => {
    return props.type === 'posting'
      ? processPostingContributions(props.contributions as Contribution[])
      : processCommentingContributions(props.contributions as CommentingContribution[])
  }, [props])

  return (
    <div className={cn(`w-full grid grid-rows-${WEEKS_TO_DISPLAY} grid-flow-col gap-1`, props.className)}>
      {matrix.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((value, colIndex) => {
            // Get contribution data from the weekly contributions matrix
            const contribution = weeklyContributions[rowIndex][colIndex] || undefined;
            return (
              <ContributionItem
                key={`${rowIndex}-${colIndex}`}
                contribution={contribution}
                value={value}
                maxValue={maxValue}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}