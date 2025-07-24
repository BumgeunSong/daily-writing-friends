import { useMemo } from "react"
import { cn } from "@/shared/utils/cn"
import { ContributionItem } from "@/stats/components/ContributionItem"
import { Contribution } from "@/stats/model/WritingStats"
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils'

// 도메인별 union props
export type ContributionGraphProps =
  | { type: 'posting'; contributions: Contribution[]; className?: string }
  | { type: 'commenting'; contributions: CommentingContribution[]; className?: string }

export function ContributionGraph(props: ContributionGraphProps) {
  const { matrix, maxValue, weeklyContributions } = useMemo(() => {
    // Create 4x5 grid matrix: 4 weeks (rows) x 5 weekdays (columns: Mon-Fri)
    const matrix: (number | null)[][] = Array.from({ length: 4 }, () => Array(5).fill(null));
    // Create matching matrix to store contribution data for each cell
    const weeklyContributions: (Contribution | CommentingContribution | null)[][] = Array.from({ length: 4 }, () => Array(5).fill(null));
    
    if (props.type === 'posting') {
      const contributions = props.contributions as Contribution[];
      
      // Calculate 4 weeks ago from today to define our time range
      const today = new Date();
      const fourWeeksAgo = new Date(today);
      fourWeeksAgo.setDate(today.getDate() - (4 * 7 - 1)); // 27 days ago
      
      // Filter contributions within the last 4 weeks
      const recentContributions = contributions.filter(c => {
        const contributionDate = new Date(c.createdAt);
        return contributionDate >= fourWeeksAgo && contributionDate <= today;
      });
      
      // Place each contribution in the correct week/weekday position
      recentContributions.forEach(contribution => {
        const date = new Date(contribution.createdAt);
        const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        
        // Skip weekends (0=Sunday, 6=Saturday)
        if (dayOfWeek === 0 || dayOfWeek === 6) return;
        
        // Convert to Monday=0, Tuesday=1, ..., Friday=4
        const weekdayColumn = dayOfWeek - 1;
        
        // Calculate which week this contribution belongs to (0=oldest week, 3=newest week)
        const daysDifference = Math.floor((date.getTime() - fourWeeksAgo.getTime()) / (1000 * 60 * 60 * 24));
        const weekRow = Math.floor(daysDifference / 7);
        
        // Ensure we're within bounds
        if (weekRow >= 0 && weekRow < 4 && weekdayColumn >= 0 && weekdayColumn < 5) {
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
      const fourWeeksAgo = new Date(today);
      fourWeeksAgo.setDate(today.getDate() - (4 * 7 - 1));
      
      const recentContributions = contributions.filter(c => {
        const contributionDate = new Date(c.createdAt);
        return contributionDate >= fourWeeksAgo && contributionDate <= today;
      });
      
      recentContributions.forEach(contribution => {
        const date = new Date(contribution.createdAt);
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek === 0 || dayOfWeek === 6) return;
        
        const weekdayColumn = dayOfWeek - 1;
        const daysDifference = Math.floor((date.getTime() - fourWeeksAgo.getTime()) / (1000 * 60 * 60 * 24));
        const weekRow = Math.floor(daysDifference / 7);
        
        if (weekRow >= 0 && weekRow < 4 && weekdayColumn >= 0 && weekdayColumn < 5) {
          matrix[weekRow][weekdayColumn] = contribution.countOfCommentAndReplies;
          weeklyContributions[weekRow][weekdayColumn] = contribution;
        }
      });
      
      const maxValue = Math.max(...contributions.map(c => c.countOfCommentAndReplies ?? 0), 0);
      return { matrix, maxValue, weeklyContributions };
    }
  }, [props]);

  return (
    <div className={cn("w-full grid grid-rows-4 grid-flow-col gap-1", props.className)}>
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