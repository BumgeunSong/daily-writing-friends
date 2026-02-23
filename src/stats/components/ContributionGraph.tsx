import { useMemo, memo } from 'react';
import { cn } from '@/shared/utils/cn';
import { ContributionItem } from '@/stats/components/ContributionItem';
import { useContributionGridData, type ContributionType } from '@/stats/hooks/useContributionGrid';
import type { Contribution } from '@/stats/model/WritingStats';
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import { WEEKS_TO_DISPLAY } from '@/stats/utils/contributionGridUtils';

export type ContributionGraphProps =
  | { type: 'posting'; contributions: Contribution[]; className?: string; userId?: string }
  | { type: 'commenting'; contributions: CommentingContribution[]; className?: string };

/**
 * Renders a single week row in the contribution grid
 */
function ContributionGraphWeekRow({
  row,
  weeklyContributions,
  maxValue,
  rowIndex,
}: {
  row: (number | null)[];
  weeklyContributions: ((Contribution | CommentingContribution) | null)[];
  maxValue: number;
  rowIndex: number;
}) {
  return (
    <div className='flex gap-1'>
      {row.map((value, colIndex) => {
        const contribution = weeklyContributions[colIndex] || undefined;
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
  );
}

/**
 * Main ContributionGraph component
 * Displays a GitHub-style contribution grid showing activity over the past 4 weeks
 */
function ContributionGraphInner(props: ContributionGraphProps) {
  const { matrix, maxValue, weeklyContributions } = useContributionGridData(
    props.contributions,
    props.type as ContributionType,
  );

  // Memoize the grid rendering to prevent unnecessary re-renders
  const gridContent = useMemo(() => {
    return matrix.map((row, rowIndex) => (
      <ContributionGraphWeekRow
        key={rowIndex}
        row={row}
        weeklyContributions={weeklyContributions[rowIndex]}
        maxValue={maxValue}
        rowIndex={rowIndex}
      />
    ));
  }, [matrix, weeklyContributions, maxValue]);

  return (
    <div
      className={cn(
        `w-full grid grid-rows-${WEEKS_TO_DISPLAY} grid-flow-col gap-1`,
        props.className,
      )}
    >
      {gridContent}
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const ContributionGraph = memo(ContributionGraphInner);
