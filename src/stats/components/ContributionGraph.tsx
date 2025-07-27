import { useMemo } from 'react';
import { cn } from '@/shared/utils/cn';
import { ContributionItem } from '@/stats/components/ContributionItem';
import { Contribution } from '@/stats/model/WritingStats';
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import {
  processPostingContributions,
  processCommentingContributions,
  WEEKS_TO_DISPLAY,
} from '@/stats/utils/contributionGridUtils';

// Main component props
export type ContributionGraphProps =
  | { type: 'posting'; contributions: Contribution[]; className?: string; userId?: string }
  | {
      type: 'commenting';
      contributions: CommentingContribution[];
      className?: string;
    };

export function ContributionGraph(props: ContributionGraphProps) {
  // Use useMemo to prevent unnecessary recalculations
  const result = useMemo(() => {
    return props.type === 'posting'
      ? processPostingContributions(props.contributions as Contribution[])
      : processCommentingContributions(props.contributions as CommentingContribution[]);
  }, [props.type, props.contributions]);

  const { matrix, maxValue, weeklyContributions } = result;

  return (
    <div
      className={cn(
        `w-full grid grid-rows-${WEEKS_TO_DISPLAY} grid-flow-col gap-1`,
        props.className,
      )}
    >
      {matrix.map((row, rowIndex) => (
        <div key={rowIndex} className='flex gap-1'>
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
