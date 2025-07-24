import { useMemo } from "react"
import { cn } from "@/shared/utils/cn"
import { ContributionItem } from "@/stats/components/ContributionItem"
import { Contribution } from "@/stats/model/WritingStats"
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils'

// Constants for grid layout
const WEEKS_TO_DISPLAY = 4
const WEEKDAYS_COUNT = 5
const DAYS_PER_WEEK = 7
const SUNDAY = 0
const SATURDAY = 6
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24

// Helper function to filter contributions within time range
function filterContributionsInTimeRange<T extends { createdAt: any }>(
  contributions: T[],
  startDate: Date,
  endDate: Date
): T[] {
  return contributions.filter(c => {
    const contributionDate = new Date(c.createdAt);
    return contributionDate >= startDate && contributionDate <= endDate;
  });
}

// 도메인별 union props
export type ContributionGraphProps =
  | { type: 'posting'; contributions: Contribution[]; className?: string }
  | { type: 'commenting'; contributions: CommentingContribution[]; className?: string }

export function ContributionGraph(props: ContributionGraphProps) {
  const { matrix, maxValue, weeklyContributions } = useMemo(() => {
    // Create grid matrix: weeks (rows) x weekdays (columns: Mon-Fri)
    const matrix: (number | null)[][] = Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(WEEKDAYS_COUNT).fill(null));
    // Create matching matrix to store contribution data for each cell
    const weeklyContributions: (Contribution | CommentingContribution | null)[][] = Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(WEEKDAYS_COUNT).fill(null));
    
    if (props.type === 'posting') {
      const contributions = props.contributions as Contribution[];
      
      // Calculate weeks ago from today to define our time range
      const today = new Date();
      const weeksAgo = new Date(today);
      weeksAgo.setDate(today.getDate() - (WEEKS_TO_DISPLAY * DAYS_PER_WEEK - 1));
      
      // Filter contributions within the last weeks
      const recentContributions = filterContributionsInTimeRange(contributions, weeksAgo, today);
      
      // Place each contribution in the correct week/weekday position
      recentContributions.forEach(contribution => {
        const date = new Date(contribution.createdAt);
        const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        
        // Skip weekends (Sunday and Saturday)
        if (dayOfWeek === SUNDAY || dayOfWeek === SATURDAY) return;
        
        // Convert to Monday=0, Tuesday=1, ..., Friday=4
        const weekdayColumn = dayOfWeek - 1;
        
        // Calculate which week this contribution belongs to (0=oldest week, newest=WEEKS_TO_DISPLAY-1)
        const daysDifference = Math.floor((date.getTime() - weeksAgo.getTime()) / MILLISECONDS_PER_DAY);
        const weekRow = Math.floor(daysDifference / DAYS_PER_WEEK);
        
        // Ensure we're within bounds
        if (weekRow >= 0 && weekRow < WEEKS_TO_DISPLAY && weekdayColumn >= 0 && weekdayColumn < WEEKDAYS_COUNT) {
          matrix[weekRow][weekdayColumn] = contribution.contentLength;
          weeklyContributions[weekRow][weekdayColumn] = contribution;
        }
      });
      
      // Find maximum value for intensity calculation
      const maxValue = Math.max(...contributions.map(c => c.contentLength ?? 0), 0);
      return { matrix, maxValue, weeklyContributions };
      
    } else {
      // Handle commenting contributions with same weekly logic
      const contributions = props.contributions as CommentingContribution[];
      
      const today = new Date();
      const weeksAgo = new Date(today);
      weeksAgo.setDate(today.getDate() - (WEEKS_TO_DISPLAY * DAYS_PER_WEEK - 1));
      
      const recentContributions = filterContributionsInTimeRange(contributions, weeksAgo, today);
      
      recentContributions.forEach(contribution => {
        const date = new Date(contribution.createdAt);
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek === SUNDAY || dayOfWeek === SATURDAY) return;
        
        const weekdayColumn = dayOfWeek - 1;
        const daysDifference = Math.floor((date.getTime() - weeksAgo.getTime()) / MILLISECONDS_PER_DAY);
        const weekRow = Math.floor(daysDifference / DAYS_PER_WEEK);
        
        if (weekRow >= 0 && weekRow < WEEKS_TO_DISPLAY && weekdayColumn >= 0 && weekdayColumn < WEEKDAYS_COUNT) {
          matrix[weekRow][weekdayColumn] = contribution.countOfCommentAndReplies;
          weeklyContributions[weekRow][weekdayColumn] = contribution;
        }
      });
      
      const maxValue = Math.max(...contributions.map(c => c.countOfCommentAndReplies ?? 0), 0);
      return { matrix, maxValue, weeklyContributions };
    }
  }, [props]);

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